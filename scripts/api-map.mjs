#!/usr/bin/env node
// API surface mapper — the "nodal visualizer".
// Scans app/api/**/route.ts and produces:
//   docs/api-map.json — machine-readable graph (nodes + edges + tables)
//   docs/api-map.md   — the concrete reference doc (auth + edges + tables)
// Run: npm run api:map
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const API_DIR = join(ROOT, 'app/api');
const OUT_JSON = join(ROOT, 'docs/api-map.json');
const OUT_MD = join(ROOT, 'docs/api-map.md');

function walk(dir) {
  let out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (entry === 'route.ts') out.push(p);
  }
  return out;
}

function routePath(file) {
  const rel = relative(ROOT, file); // app/api/admin/login/route.ts
  return rel
    .replace(/\/route\.ts$/, '') // app/api/admin/login
    .replace(/^app/, '') // /api/admin/login
    .replace(/\[([^\]]+)\]/g, ':$1');
}

const GUARDS = {
  isAdminAuthenticated: 'admin',
  requireAdmin: 'admin',
  getUserSession: 'user',
  requireAuthFor: 'user-own',
  requireAuth: 'user|admin',
  CRON_SECRET: 'cron-secret',
};

const files = walk(API_DIR);
const nodes = [];

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const methods = [...src.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)/g)].map((m) => m[1]).sort();

  // Auth: highest bar found; multiple guards are ORed in the route, so list all.
  const found = Object.keys(GUARDS).filter((g) => src.includes(g));
  const auth = found.length
    ? [...new Set(found.map((g) => GUARDS[g]))].join(' ∨ ')
    : 'OPEN';

  // Internal fetch edges: fetch(`/api/...` or ${origin}/api/...
  const edges = [];
  const edgeRe = new RegExp("fetch\\(\\s*(?:`([^`]*?/api/[^`]*?)`|'([^']*?/api/[^']*?)')", 'g');
  for (const m of src.matchAll(edgeRe)) {
    const raw = (m[1] || m[2]).replace(/\$\{[^}]*\}/g, '*').replace(/\?.*$/, '');
    edges.push(raw);
  }

  // Cookie forwarding on self-fetches (only meaningful when the route fetches siblings)
  const forwardsCookie = /headers:\s*\{[^}]*cookie|internalHeaders|req\.headers\.get\('cookie'\)/.test(src);
  const cookieStatus = edges.length === 0 ? null : forwardsCookie ? 'ok' : 'MISSING';

  // Tables and RPCs
  const tables = [...new Set([...src.matchAll(/\.from\('([a-z_]+)'\)/g)].map((m) => m[1]))].sort();
  const rpcs = [...new Set([...src.matchAll(/\.rpc\('([a-z_]+)'\)/g)].map((m) => m[1]))].sort();

  nodes.push({
    route: routePath(file),
    methods,
    auth,
    calls: edges.map((e) => e.replace(/^https?:\/\/\*/, '').replace(/^\*/, '')),
    selfFetchCookie: cookieStatus,
    tables,
    rpcs,
  });
}

// Markdown reference
const byAuth = {};
for (const n of nodes) (byAuth[n.auth] ??= []).push(n);

let md = `# API map — generated reference\n\nRegenerate: \`npm run api:map\` (scans app/api — do not edit by hand).\nGenerated: ${new Date().toISOString()}\n\n`;
md += `**${nodes.length} routes.** Auth legend: admin = admin session cookie · user = employee PIN session · user-own = session may only touch its own slug · cron-secret = Bearer CRON_SECRET · OPEN = no auth (must be justified below).\n\n`;

for (const auth of [...Object.keys(byAuth)].sort()) {
  md += `## ${auth}\n\n| Route | Methods | Calls (internal) | Tables | RPCs |\n|---|---|---|---|---|\n`;
  for (const n of byAuth[auth].sort((a, b) => a.route.localeCompare(b.route))) {
    const calls = n.calls.length ? n.calls.map((c) => `\`${c}\``).join('<br>') : '—';
    const tables = n.tables.length ? n.tables.join(', ') : '—';
    const rpcs = n.rpcs.length ? n.rpcs.join(', ') : '—';
    md += `| \`${n.route}\` | ${n.methods.join(', ')} | ${calls} | ${tables} | ${rpcs} |\n`;
  }
  md += '\n';
}

const flagged = nodes.filter((n) => n.selfFetchCookie === 'MISSING');
if (flagged.length) {
  md += `## ⚠ Cookie-dropping self-fetches\n\nThese routes fetch sibling API routes without forwarding the request cookie — the inner call silently 401s once the target is auth-gated:\n\n`;
  for (const n of flagged) md += `- \`${n.route}\` → ${n.calls.join(', ')}\n`;
  md += '\n';
}

const open = (byAuth['OPEN'] || []).map((n) => n.route);
md += `## OPEN routes — justification register\n\nEvery route below has no auth. Keep this list short and each entry justified:\n`;
for (const r of open) {
  const why = {
    '/api/admin/login': 'credential check itself (rate-limited via login_attempts)',
    '/api/admin/logout': 'clears a cookie; nothing read',
    '/api/auth/verify-pin': 'credential check itself (rate-limited via login_attempts)',
    '/api/employees': 'login-screen name autocomplete; returns id/full_name/slug only, ≥2-char query, limit 10',
    '/api/beta-signup': 'public beta signup form (validated + capped goals)',
    '/api/basecamp/auth': 'OAuth entry redirect',
    '/api/basecamp/callback': 'OAuth callback (verifies state/code with Basecamp)',
    '/api/basecamp/webhook': 'shared-secret token gate (BASECAMP_WEBHOOK_TOKEN) — see route',
  }[r];
  md += `- \`${r}\` — ${why || '⚠ UNJUSTIFIED — gate or document why open'}\n`;
}

writeFileSync(OUT_JSON, JSON.stringify({ generated: new Date().toISOString(), nodes }, null, 2));
writeFileSync(OUT_MD, md);
console.log(`api-map: ${nodes.length} routes → docs/api-map.{json,md}`);
if (flagged.length) {
  console.warn('⚠ cookie-dropping self-fetches:');
  for (const n of flagged) console.warn('  -', n.route, '→', n.calls.join(', '));
}
