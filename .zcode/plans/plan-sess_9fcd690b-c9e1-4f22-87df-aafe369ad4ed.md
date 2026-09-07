# Track C — Glass UI Redesign + Refactors

Design direction (as agreed): violet #6a63b6 brand, dark-mode-first frosted glass, ambient gradient blobs, mint kept as celebration/reward accent. Admin keeps tab nav + `?tab=` deep links + Cmd+K palette. IST fixes include the API routes.

Execution order: **C1 foundation → C2 page refactor → C3 IST fixes → C4 admin glass → C5 user glass → C6 cleanup/verify**. `npm run build` after each phase.

## C1 — Design foundation (tokens + primitives)

**`app/globals.css`** — add glass tokens to `:root` and `.dark` (dark-first values):
- `--glass-bg` (panel: `rgba(255,255,255,0.06)` dark / `rgba(255,255,255,0.55)` light), `--glass-bg-strong` (navbars/modals, higher opacity), `--glass-border`, `--glass-highlight` (inset top edge), ambient blob tokens `--ambient-1/2`.
- Component classes: `.glass` (frosted panel: bg token + `backdrop-blur-xl` + border + inset highlight + existing elevation shadows), `.glass-strong`, `.glass-interactive` (hover/active). These become the vocabulary replacing hand-rolled `rounded-2xl border-border/50 bg-card` strings.

**`app/layout.tsx`** — fix dark-flash: inline pre-hydration script in `<head>` that applies `dark` class from `localStorage.theme` before first paint (provider defaults dark but currently paints light first). Simplify `theme-provider.tsx` accordingly, keep its context API.

**`components/ui/*`** — restyle shared primitives once (card → glass surface, dialog → blur overlay + glass panel, subtle token alignment in button/input/select/badge/table). Since most UI hand-rolls its own card divs, primitives are only part of the win — the bulk is in C4/C5 inline classes.

## C2 — Extract `app/page.tsx` (1,514 lines → thin composition)

Behavior-preserving extraction into new `hooks/` + `components/home/`:
- `hooks/use-attendance-session.ts` — owns `hasOpen/currentSession/isSubmitting/mode/elapsedTime/msg/checkInSuccess/lateCheckIn/autoCheckoutWarning` + `act/performCheckout/checkout/checkSessionStatus` + auto-checkout effect. **Merges the verbatim-duplicated hold-progress effects (L170–202 and L473–505) — currently holds complete at double speed and can double-fire checkout.**
- `hooks/use-dashboard-data.ts` (punctuality stats; delete dead state `todaySummary/yesterdaySummary/meYesterday/leaveBalance/monthlyStats` after grep-verifying they're write-only), `hooks/use-streak.ts`, `hooks/use-weekly-plan.ts`, `hooks/use-reminders.ts`, `hooks/use-clock.ts`, `hooks/use-hold-to-confirm.ts`.
- `components/home/`: `hold-to-confirm-button.tsx`, `action-card.tsx` (mode pill + hold button), `weekend-warning.tsx`, `auto-checkout-banner.tsx`, `greeting-header.tsx`, `bottom-nav.tsx`.
- Remove page-local duplicates of `formatISTTime/Short`, dead `formatDisplayTime`, unused `WeekStrip` import, and the flag-gated never-rendered `AssistantChat` import.
- Also delete the confirmed-orphaned components: `location-checkin.tsx`, `ai-assistant.tsx`, `knowledge-base-manager.tsx`, `assistant-chat.tsx` (grep-verify zero imports first).

## C3 — lib/time.ts IST fixes + API routes

**`lib/time.ts`:**
- `isWorkdayIST()` — derive weekday from the IST date key, not `getDay()` (fixes Mon 00:00–05:30 IST being classified as Sunday on UTC servers; currently makes `cron/summary` skip Mondays).
- `getMondayOfWeek()` — compute Monday in IST date-key space (fixes returning Sunday's date for early-IST-morning calls). Client callers (`app/page.tsx`, `wfh-planner-tab.tsx`, `admin-overview-workspace.tsx`) get the fix automatically.
- New helpers: `istDayWindow(date)` → UTC instants bounding the IST calendar day; `istDateKeyOf(date)` → group-by key.

**Client stragglers:** greeting date (`page.tsx` L1148, device-local) → IST formatter; reminders dedupe key (L923, `en-US`) → IST date key; weekend warning → `isWorkdayIST`.

**API routes (as approved):**
- `api/today`, `api/cron/summary` — replace UTC-midnight `setHours(0,0,0,0)` windows with `istDayWindow()`.
- `api/admin/{historical-data,daily-stats,mood-data,user-stats,recent-activity,today-export,chatbot-data}` — replace UTC `toISOString()` group keys and local `getDate/setDate` windows with `istDateKeyOf`/`istDayWindow` (fixes sessions before 05:30 IST landing on the previous day in dashboards).
- `checkin/checkout/auto-checkout` untouched (tz-agnostic duration math).

## C4 — Admin glass redesign (tab nav kept)

- `workspace-shell.tsx` — glass floating sticky nav (`.glass-strong`), active tab = violet glass pill, glass header.
- `app/admin/page.tsx` — tokenize ambient blobs (`#67dfc2`/`#8f7cff` → `--ambient-*`), glass panels.
- Restyle inline classes in all workspaces: overview, attendance (sticky filter bar), people, AI, `admin-leave-management.tsx` (781 lines), `employee-detail-drawer.tsx`, `stat-tile.tsx`, command palette.
- Pages: `admin/login`, `pin-management`, `saved-responses`. Remove legacy inline Playfair font styles encountered (CSS override stays as safety net).

## C5 — User-side glass + dark-mode gap fixes

- **Hold-to-check-in button** (`page.tsx` L1236–1250): replace `#dc2626`/`#90EE90` inline gradients + rgba glows with brand gradient + `success` tokens; mint pulse → token.
- `components/leave-management.tsx` (942 lines): fuchsia get-well card (L174) → brand/success glass; scratch-card canvas colors (L112–117) → token constants; full restyle of balances/dialog/history.
- `app/u/[slug]/page.tsx` — rebuild on theme tokens + glass (currently fully hardcoded light: `bg-white`, `bg-gray-200`).
- Dark-mode fixes: `pin-change-modal.tsx` (`bg-white`/`gray-*` without dark variants), rest of `attendance-history.tsx` (470-line calendar), `wfh-planner-tab.tsx`, `recent-activity.tsx`, `today-presence-card.tsx`, `overview-card.tsx`, `presence-strip.tsx`, `status-badge.tsx`, `score-breakdown-modal.tsx`, `dashboard/mood-modal.tsx`, `pin-login.tsx`, `leave-loader.tsx` (teal → token).
- `lib/use-reward.ts` — confetti palette → brand violet + mint constants.
- Verify light mode too (glass tokens have light variants).

## C6 — Final verification

1. `npm run build` (exit 0).
2. IST sanity script: `isWorkdayIST`/`getMondayOfWeek`/`istDayWindow` evaluated at boundary times (e.g., Mon 01:00 IST on a UTC clock).
3. Run dev server and browser-verify flows: PIN login → hold check-in → mood modal → checkout, leave request, admin tabs, `u/[slug]` — in dark mode, with light-mode spot checks.
4. Visual acceptance pass (judge agent) on rendered screenshots of home tabs, admin workspaces, login pages.

**Out of scope (noted, unchanged):** Next 16 major upgrade, remaining ungated legacy API routes (`/api/employees`, `/api/basecamp/*` etc.), font-loading consolidation beyond removing dead references encountered during restyling.