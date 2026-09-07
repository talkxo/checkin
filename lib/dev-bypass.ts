/**
 * LOCAL-ONLY API BYPASS — never runs in production.
 *
 * Installed only when BOTH are true:
 *   1. `process.env.NODE_ENV === 'development'`   (next dev)
 *   2. `NEXT_PUBLIC_DEV_BYPASS === 'true'`        (set in gitignored .env.local)
 *
 * It patches window.fetch to serve an in-memory fake world (employees,
 * sessions, leave, admin stats) so the logged-in UI can be demoed without a
 * database. Production deployments never set the flag, so this module is a
 * no-op there. Nothing is written anywhere — refresh resets the world.
 */

/* eslint-disable no-console */

type Json = Record<string, any>;

export function isDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_DEV_BYPASS === 'true'
  );
}

const TZ = 'Asia/Kolkata';

/* ------------------------------------------------------------------ */
/* Seed data                                                           */
/* ------------------------------------------------------------------ */

const ROSTER = [
  { id: 'dev-emp-1', full_name: 'Asha Dev', slug: 'asha-dev', email: 'asha@insyde.test' },
  { id: 'dev-emp-2', full_name: 'Rahul Test', slug: 'rahul-test', email: 'rahul@insyde.test' },
  { id: 'dev-emp-3', full_name: 'Priya Demo', slug: 'priya-demo', email: 'priya@insyde.test' },
  { id: 'dev-emp-4', full_name: 'Karan Mock', slug: 'karan-mock', email: 'karan@insyde.test' },
  { id: 'dev-emp-5', full_name: 'Neha Sample', slug: 'neha-sample', email: 'neha@insyde.test' },
  { id: 'dev-emp-6', full_name: 'Arjun Placeholder', slug: 'arjun-placeholder', email: 'arjun@insyde.test' },
];
const ME = ROSTER[0];

const LEAVE_TYPES = [
  { id: 'lt-casual', name: 'Casual Leave', description: 'Short personal time off', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'lt-sick', name: 'Sick Leave', description: 'Medical leave', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'lt-bonus', name: 'Bonus Leave', description: 'Earned via extra office days', is_active: true, created_at: '2026-01-01T00:00:00Z' },
];

const LEAVE_BALANCE = [
  { leave_type_name: 'Casual Leave', total_entitlement: 12, used_leaves: 2, pending_leaves: 1, available_leaves: 9 },
  { leave_type_name: 'Sick Leave', total_entitlement: 8, used_leaves: 1, pending_leaves: 0, available_leaves: 7 },
  { leave_type_name: 'Bonus Leave', total_entitlement: 3, used_leaves: 0, pending_leaves: 0, available_leaves: 3 },
];

const LEAVE_REQUESTS = [
  {
    id: 'lr-1', employee_id: 'dev-emp-3', leave_type_id: 'lt-casual',
    start_date: addDaysKey(2), end_date: addDaysKey(3), total_days: 2,
    reason: 'Family function', status: 'pending', approved_by: null, approved_at: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    leave_types: { name: 'Casual Leave' }, employees: { full_name: 'Priya Demo' },
  },
  {
    id: 'lr-2', employee_id: 'dev-emp-2', leave_type_id: 'lt-sick',
    start_date: addDaysKey(1), end_date: addDaysKey(1), total_days: 1,
    reason: 'Fever', status: 'pending', approved_by: null, approved_at: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    leave_types: { name: 'Sick Leave' }, employees: { full_name: 'Rahul Test' },
  },
  {
    id: 'lr-3', employee_id: 'dev-emp-1', leave_type_id: 'lt-casual',
    start_date: addDaysKey(6), end_date: addDaysKey(7), total_days: 2,
    reason: 'Short trip', status: 'approved', approved_by: 'admin', approved_at: new Date().toISOString(),
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    leave_types: { name: 'Casual Leave' }, employees: { full_name: 'Asha Dev' },
  },
];

interface MockSession {
  id: string;
  employee_id: string;
  mode: 'office' | 'remote';
  checkin_ts: string;
  checkout_ts: string | null;
  mood: string | null;
  mood_comment: string | null;
}

/** Deterministic pseudo-random from a string seed. */
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function istDateKey(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function addDaysKey(offset: number): string {
  return istDateKey(offset);
}

/** UTC instant for a given IST wall-clock time. */
function istToUtcIso(dateKey: string, hour: number, minute: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour, minute) - 330 * 60 * 1000).toISOString();
}

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
}

function isWeekendKey(dateKey: string): boolean {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 || dow === 6;
}

/** A year of past sessions per employee, deterministic per date+employee. */
function generateSessions(employeeId: string, seedSalt: string): MockSession[] {
  const sessions: MockSession[] = [];
  const todayKey = istDateKey();

  for (let offset = 400; offset >= 0; offset--) {
    const key = istDateKey(-offset);
    if (isWeekendKey(key)) continue;
    const rand = seededRandom(employeeId + seedSalt + key);

    // ~15% of weekdays are skipped entirely (missed days)
    if (rand() < 0.15) continue;
    // Today only has a session if it was "checked in" — handled by live state
    if (key === todayKey) continue;

    const checkinHour = 9;
    const checkinMinute = Math.floor(rand() * 85); // 09:00 – 10:24 IST
    const checkinTs = istToUtcIso(key, checkinHour, checkinMinute);
    const workedMinutes = 430 + Math.floor(rand() * 140); // ~7h10m – 9h30m
    const checkoutTs = new Date(new Date(checkinTs).getTime() + workedMinutes * 60 * 1000).toISOString();
    const moods = ['good', 'great', 'productive', 'ok', 'challenging'];

    sessions.push({
      id: `dev-sess-${employeeId}-${key}`,
      employee_id: employeeId,
      mode: rand() < 0.45 ? 'remote' : 'office',
      checkin_ts: checkinTs,
      checkout_ts: checkoutTs,
      mood: moods[Math.floor(rand() * moods.length)],
      mood_comment: '',
    });
  }
  return sessions;
}

/* ------------------------------------------------------------------ */
/* Mutable world state                                                 */
/* ------------------------------------------------------------------ */

const world = {
  roster: ROSTER.map((e) => ({ ...e })),
  sessions: ROSTER.flatMap((e) => generateSessions(e.id, '-seed')),
  leaveRequests: LEAVE_REQUESTS.map((r) => ({ ...r })),
  openSession: null as MockSession | null,
  wfhDays: ['Wed'] as string[],
};

function meSessions(): MockSession[] {
  return world.sessions.filter((s) => s.employee_id === ME.id);
}

function makeSession(mode: 'office' | 'remote'): MockSession {
  return {
    id: `dev-sess-live-${Date.now()}`,
    employee_id: ME.id,
    mode,
    checkin_ts: new Date().toISOString(),
    checkout_ts: null,
    mood: null,
    mood_comment: null,
  };
}

/* ------------------------------------------------------------------ */
/* Shape builders                                                      */
/* ------------------------------------------------------------------ */

function publicEmployee(e: (typeof ROSTER)[number]) {
  return { id: e.id, full_name: e.full_name, slug: e.slug, email: e.email };
}

function historyPayloadForDate(dateKey: string) {
  const daySessions = meSessions().filter((s) => istDateKeyOfIso(s.checkin_ts) === dateKey);
  const liveToday =
    world.openSession && istDateKeyOfIso(world.openSession.checkin_ts) === dateKey ? [world.openSession] : [];
  const all = [...daySessions, ...liveToday];

  if (all.length === 0) {
    return { checkinTime: null, checkoutTime: null, totalHours: 'N/A', status: 'not_started', mode: null };
  }
  const first = all.reduce((a, b) => (a.checkin_ts < b.checkin_ts ? a : b));
  const lastOut = all.reduce<MockSession | null>((a, b) => {
    if (!b.checkout_ts) return a;
    if (!a || !a.checkout_ts || b.checkout_ts > a.checkout_ts) return b;
    return a;
  }, null);
  const totalMs = all.reduce((sum, s) => {
    const end = s.checkout_ts ? new Date(s.checkout_ts).getTime() : Date.now();
    return sum + (end - new Date(s.checkin_ts).getTime());
  }, 0);
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);

  return {
    checkinTime: hhmm(first.checkin_ts),
    checkoutTime: lastOut?.checkout_ts ? hhmm(lastOut.checkout_ts) : 'N/A',
    totalHours: all.some((s) => !s.checkout_ts) ? 'Active' : `${hours}h ${minutes}m`,
    status: all.some((s) => !s.checkout_ts) ? 'active' : 'complete',
    mode: first.mode,
  };
}

function istDateKeyOfIso(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(iso)
  );
}

function monthlyAttendance(): Json {
  const map: Json = {};
  for (const s of meSessions()) {
    const key = istDateKeyOfIso(s.checkin_ts);
    const entry = (map[key] ??= { checkinTime: s.checkin_ts, checkoutTime: null, sessions: [] as Json[] });
    entry.sessions.push({ checkin_ts: s.checkin_ts, checkout_ts: s.checkout_ts });
    if (!entry.checkoutTime && s.checkout_ts) entry.checkoutTime = s.checkin_ts;
    if (s.checkout_ts) entry.checkoutTime = s.checkout_ts;
  }
  if (world.openSession) {
    const key = istDateKeyOfIso(world.openSession.checkin_ts);
    const entry = (map[key] ??= { checkinTime: world.openSession.checkin_ts, checkoutTime: null, sessions: [] });
    entry.sessions.push({ checkin_ts: world.openSession.checkin_ts, checkout_ts: null });
  }
  return {
    attendance: map,
    leaveDates: [istDateKey(-12), istDateKey(-11), istDateKey(-4)],
    holidays: [
      { date: '2026-09-04', name: 'Janmashtami' },
      { date: '2026-10-02', name: 'Gandhi Jayanti' },
      { date: '2026-10-20', name: 'Dussehra' },
      { date: '2026-11-09', name: 'Goverdhan Puja' },
      { date: '2026-12-25', name: 'Christmas' },
    ],
  };
}

function punctualityStats() {
  const windowDates: string[] = [];
  for (let i = 0; i < 42; i++) {
    const key = istDateKey(-i);
    if (!isWeekendKey(key)) windowDates.push(key);
  }
  const recent = meSessions()
    .slice(-10)
    .map((s, idx) => {
      const checkin = new Date(s.checkin_ts);
      const minutes =
        Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: TZ }).format(checkin)) * 60 +
        Number(new Intl.DateTimeFormat('en-GB', { minute: '2-digit', hour12: false, timeZone: TZ }).format(checkin));
      const baseScore = minutes <= 585 ? 3 : minutes <= 615 ? 2 : minutes <= 645 ? 1 : 0;
      const hoursWorked = Math.round(((new Date(s.checkout_ts ?? new Date()).getTime() - checkin.getTime()) / 3600000) * 10) / 10;
      return {
        date: istDateKeyOfIso(s.checkin_ts),
        checkinTime: hhmm(s.checkin_ts),
        checkoutTime: s.checkout_ts ? hhmm(s.checkout_ts) : null,
        hoursWorked,
        mode: s.mode,
        baseScore,
        hoursBonus: hoursWorked >= 8 ? 1 : 0,
        checkoutBonus: s.checkout_ts ? 1 : 0,
        modeBonus: s.mode === 'office' ? 0.5 : 0,
        totalScore: Math.min(
          3.9,
          baseScore + (hoursWorked >= 8 ? 1 : 0) + (s.checkout_ts ? 1 : 0) + (s.mode === 'office' ? 0.5 : 0)
        ),
      };
    });

  const punctualityScore = Number(recent.reduce((sum, d) => sum + d.totalScore, 0).toFixed(2));
  return {
    punctualityScore,
    maxScore: 42,
    noFillDays: 1,
    avgCheckinTime: '09:34',
    checkinStatus: 'on-time' as const,
    dayBreakdown: recent,
    consistencyBonus: 2,
    streakBonus: 3,
    windowDates,
  };
}

function dashboardInit() {
  return {
    success: true,
    employee: { ...ME, active: true, created_at: '2026-01-01T00:00:00Z' },
    stats: {
      leaveBalance: {
        employee: { id: ME.id, full_name: ME.full_name, slug: ME.slug },
        year: new Date().getFullYear(),
        leaveBalance: LEAVE_BALANCE,
        accrualHistory: [
          {
            id: 'acc-1', employee_id: ME.id, leave_type_id: 'lt-bonus', year: new Date().getFullYear(),
            month: new Date().getMonth() + 1, extra_office_days: 3, accrued_leaves: 1,
            calculation_date: istDateKey(-5), created_at: new Date().toISOString(),
          },
        ],
        pendingRequests: world.leaveRequests.filter((r) => r.employee_id === ME.id && r.status === 'pending'),
      },
      monthlyStats: { daysOnTime: 16, totalHours: 128 },
      punctualityStats: punctualityStats(),
    },
    team: { presence: [] },
    timestamp: new Date().toISOString(),
  };
}

function attendanceReport(startDate?: string | null, endDate?: string | null) {
  const startKey = startDate || istDateKey(-30);
  const endKey = endDate || istDateKey();
  const inRange = (iso: string) => {
    const key = istDateKeyOfIso(iso);
    return key >= startKey && key <= endKey;
  };
  // Working days in range (Mon–Fri between startKey and endKey, capped at 31)
  const [sy, sm, sd] = startKey.split('-').map(Number);
  const [ey, em, ed] = endKey.split('-').map(Number);
  let elapsedWorkingDays = 0;
  for (const cursor = new Date(Date.UTC(sy, sm - 1, sd)); cursor <= new Date(Date.UTC(ey, em - 1, ed)); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const dow = cursor.getUTCDay();
    if (dow >= 1 && dow <= 5) elapsedWorkingDays++;
  }
  elapsedWorkingDays = Math.min(elapsedWorkingDays, 31);

  const employeeSummaries = world.roster.map((e) => {
    const sessions = world.sessions.filter((s) => s.employee_id === e.id && inRange(s.checkin_ts));
    const liveForEmployee =
      e.id === ME.id && world.openSession && inRange(world.openSession.checkin_ts)
        ? [world.openSession]
        : [];
    const mapped: Json[] = [...sessions, ...liveForEmployee.map((s) => ({ ...s }))].map((s) => ({
      id: s.id,
      date: istDateKeyOfIso(s.checkin_ts),
      checkinTime: hhmm(s.checkin_ts),
      checkoutTime: s.checkout_ts ? hhmm(s.checkout_ts) : '—',
      hoursWorked: s.checkout_ts
        ? `${Math.floor((new Date(s.checkout_ts).getTime() - new Date(s.checkin_ts).getTime()) / 3600000)}h ${Math.floor((((new Date(s.checkout_ts).getTime() - new Date(s.checkin_ts).getTime()) % 3600000) / 60000))}m`
        : 'Active',
      mode: s.mode,
      status: s.checkout_ts ? 'Complete' : 'Active',
      mood: s.mood ?? undefined,
      moodComment: s.mood_comment ?? undefined,
    }));

    const uniqueDays = new Set(mapped.map((s) => s.date));
    const officeDays = new Set(mapped.filter((s) => s.mode === 'office').map((s) => s.date)).size;
    const remoteDays = new Set(mapped.filter((s) => s.mode === 'remote').map((s) => s.date)).size;
    const totalHours = mapped.reduce((sum, s) => {
      const [h, m] = String(s.hoursWorked).match(/(\d+)h (\d+)m/)?.slice(1).map(Number) ?? [0, 0];
      return sum + h + m / 60;
    }, 0);
    const daysPresent = uniqueDays.size;

    return {
      employee_id: e.id,
      name: e.full_name,
      slug: e.slug,
      daysPresent,
      missedDays: Math.max(0, elapsedWorkingDays - daysPresent),
      elapsedWorkingDays: Math.max(elapsedWorkingDays, daysPresent),
      approvedLeaveDays: 0,
      pendingLeaveDays: 0,
      officeDays,
      remoteDays,
      totalHours: Math.round(totalHours * 10) / 10,
      officeHours: Math.round(totalHours * 0.6 * 10) / 10,
      remoteHours: Math.round(totalHours * 0.4 * 10) / 10,
      averageHoursPerDay: daysPresent ? Math.round((totalHours / daysPresent) * 10) / 10 : 0,
      attendanceRate: Math.min(100, Math.round((daysPresent / Math.max(1, elapsedWorkingDays)) * 100)),
      sessions: mapped,
    };
  });

  return {
    employeeSummaries,
    teamSummary: {
      totalEmployees: world.roster.length,
      totalWorkingDays: elapsedWorkingDays,
      elapsedWorkingDays,
      totalHours: Math.round(employeeSummaries.reduce((s, e) => s + e.totalHours, 0)),
      averageAttendanceRate: Math.min(100, Math.round(employeeSummaries.reduce((s, e) => s + e.attendanceRate, 0) / Math.max(1, employeeSummaries.length))),
      officePercentage: 55,
      remotePercentage: 45,
      dateRange: { startDate: istDateKey(-30), endDate: istDateKey() },
    },
  };
}

function adminToday() {
  const nowIstMinutes =
    Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: TZ }).format(new Date())) * 60 +
    Number(new Intl.DateTimeFormat('en-GB', { minute: '2-digit', hour12: false, timeZone: TZ }).format(new Date()));

  return {
    attendance: world.roster.map((e, idx) => {
      let status = 'Not Started';
      let firstIn = 'N/A';
      let lastOut = 'N/A';
      let totalHours = '0h 0m';
      if (idx === 0) {
        status = world.openSession ? 'Active' : 'Not Started';
        firstIn = world.openSession ? hhmm(world.openSession.checkin_ts) : 'N/A';
        totalHours = world.openSession
          ? `${Math.floor((Date.now() - new Date(world.openSession.checkin_ts).getTime()) / 3600000)}h 5m`
          : '0h 0m';
      } else if (idx <= nowIstMinutes / 60) {
        status = idx % 2 === 1 ? 'Active' : idx === 2 ? 'Complete' : 'Not Started';
        if (status !== 'Not Started') {
          firstIn = hhmm(istToUtcIso(istDateKey(), 9, 10 + idx * 7));
          lastOut = status === 'Complete' ? hhmm(istToUtcIso(istDateKey(), 18, 12)) : 'N/A';
          totalHours = status === 'Complete' ? '8h 42m' : '3h 18m';
        }
      }
      return {
        id: e.id,
        name: e.full_name,
        firstIn,
        lastOut,
        totalHours,
        mode: idx % 2 === 0 ? 'office' : 'remote',
        status,
        sessions: status === 'Not Started' ? 0 : 1,
      };
    }),
  };
}

function recentActivity(range: string | null, slugFilter: string | null) {
  const all = world.sessions
    .slice()
    .sort((a, b) => (a.checkin_ts < b.checkin_ts ? 1 : -1));

  const filtered = slugFilter
    ? all.filter((s) => s.employee_id === (world.roster.find((e) => e.slug === slugFilter)?.id ?? ''))
    : all;

  const entries = filtered
    .map((s) => {
      const emp = world.roster.find((e) => e.id === s.employee_id)!;
      const minsAgo = Math.round((Date.now() - new Date(s.checkin_ts).getTime()) / 60000);
      return {
        id: s.id,
        employeeName: emp.full_name,
        employeeSlug: emp.slug,
        checkinTime: s.checkin_ts,
        checkinTimeIST: hhmm(s.checkin_ts),
        date: istDateKeyOfIso(s.checkin_ts),
        mode: s.mode,
        isOpen: !s.checkout_ts,
        timeAgo: minsAgo < 1 ? 'Just now' : minsAgo < 60 ? `${minsAgo} minutes ago` : minsAgo < 1440 ? `${Math.floor(minsAgo / 60)} hours ago` : `${Math.floor(minsAgo / 1440)} days ago`,
      };
    });

  const limited = range === 'year' ? entries : entries.slice(0, 12);

  const checkedInRows: Array<{ s: { checkin_ts: string; mode: string }; emp: (typeof ROSTER)[number] }> = [];
  if (world.openSession) checkedInRows.push({ s: world.openSession, emp: ME });
  for (const e of world.roster.slice(1, 3)) {
    checkedInRows.push({ s: { checkin_ts: istToUtcIso(istDateKey(), 9, 40), mode: 'office' }, emp: e });
  }
  const currentlyCheckedIn = checkedInRows.map(({ s, emp }) => ({
    employeeName: emp.full_name,
    employeeSlug: emp.slug,
    checkinTime: s.checkin_ts,
    checkinTimeIST: hhmm(s.checkin_ts),
    mode: s.mode,
    timeAgo: '2 hours ago',
  }));

  return { recentActivity: limited, currentlyCheckedIn, range: range ?? 'week', totalRecentSessions: limited.length };
}

const AI_TEXT = `## Snapshot

Attendance held steady this week — **5 of 6 people** checked in every working day, with office/remote split near 55/45.

### What stands out
- **Neha Sample** missed two check-ins (Tue, Thu) — worth a quick check-in.
- Average check-in landed at **09:34 IST**, comfortably before the 10:30 cutoff.
- Mood skews positive (4 good/great, 1 challenging) with no concerning comments.

### Suggested next steps
1. Ping Neha about the two missed days before end of day.
2. Keep the current hybrid rhythm — no action needed.
3. Review pending leave requests (2) in the Leave workspace.`;

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

type Handler = (ctx: { path: string; url: URL; body: any }) => { status?: number; body: Json } | Json;

const ROUTES: Array<{ method: string; match: RegExp; handle: Handler }> = [
  // ── Employee auth & session ──────────────────────────────────────
  { method: 'GET', match: /^\/api\/employees$/, handle: ({ url }) => {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      return world.roster.filter((e) => e.full_name.toLowerCase().includes(q)).map((e) => ({ id: e.id, full_name: e.full_name, slug: e.slug }));
  } },
  { method: 'POST', match: /^\/api\/auth\/verify-pin$/, handle: ({ body }) => {
      const { username, pin } = body ?? {};
      const emp = world.roster.find(
        (e) =>
          e.full_name.toLowerCase() === String(username || '').toLowerCase() ||
          e.slug === String(username || '').toLowerCase() ||
          e.email === username
      );
      if (!emp || pin !== '1234') {
        return { status: 401, body: { success: false, error: 'Invalid username or PIN' } };
      }
      return { success: true, employee: publicEmployee(emp), pin_change_required: false };
  } },
  { method: 'GET', match: /^\/api\/session\/open$/, handle: () => ({
      ok: !!world.openSession,
      session: world.openSession,
      employee: publicEmployee(ME),
  }) },
  { method: 'POST', match: /^\/api\/checkin$/, handle: ({ body }) => {
      if (world.openSession) {
        return {
          employee: publicEmployee(ME),
          session: world.openSession,
          message: 'Open session already exists',
        };
      }
      world.openSession = makeSession(body?.mode === 'remote' ? 'remote' : 'office');
      world.sessions.push({ ...world.openSession });
      return { employee: publicEmployee(ME), session: world.openSession };
  } },
  { method: 'POST', match: /^\/api\/checkout$/, handle: ({ body }) => {
      if (!world.openSession) return { status: 404, body: { error: 'No open session found' } };
      world.openSession.checkout_ts = body?.checkoutTs && !isNaN(new Date(body.checkoutTs).getTime())
        ? new Date(body.checkoutTs).toISOString()
        : new Date().toISOString();
      world.openSession.mood = body?.mood ?? null;
      world.openSession.mood_comment = body?.moodComment ?? null;
      const closed = { ...world.openSession };
      world.openSession = null;
      return closed;
  } },
  { method: 'POST', match: /^\/api\/sessions\/update-mood$/, handle: () => ({ success: true }) },

  // ── Employee dashboard data ──────────────────────────────────────
  { method: 'GET', match: /^\/api\/dashboard\/init$/, handle: () => dashboardInit() },
  { method: 'GET', match: /^\/api\/today\/summary$/, handle: () => [] },
  { method: 'GET', match: /^\/api\/monthly\/stats$/, handle: () => ({ daysOnTime: 16, totalHours: 128 }) },
  { method: 'GET', match: /^\/api\/stats\/punctuality$/, handle: () => punctualityStats() },
  { method: 'GET', match: /^\/api\/summary\/me$/, handle: () => ({}) },
  { method: 'GET', match: /^\/api\/attendance\/history$/, handle: ({ url }) => {
      const date = url.searchParams.get('date') || istDateKey();
      return historyPayloadForDate(date);
  } },
  { method: 'GET', match: /^\/api\/attendance\/monthly$/, handle: () => monthlyAttendance() },
  { method: 'GET', match: /^\/api\/wfh-schedule$/, handle: ({ url }) => ({
      data: world.wfhDays.length
        ? [{
            employee_id: url.searchParams.get('employeeId') || ME.id,
            wfh_days: world.wfhDays,
            employees: { full_name: ME.full_name, slug: ME.slug },
          }]
        : [],
  }) },
  { method: 'POST', match: /^\/api\/wfh-schedule$/, handle: ({ body }) => {
      world.wfhDays = Array.isArray(body?.wfhDays) ? body.wfhDays : [];
      return { success: true, data: [{ employee_id: ME.id, wfh_days: world.wfhDays }] };
  } },

  // ── Leave ────────────────────────────────────────────────────────
  { method: 'GET', match: /^\/api\/leave\/types$/, handle: () => ({ leaveTypes: LEAVE_TYPES }) },
  { method: 'GET', match: /^\/api\/leave\/balance$/, handle: () => ({
      employee: { id: ME.id, full_name: ME.full_name, slug: ME.slug },
      year: new Date().getFullYear(),
      leaveBalance: LEAVE_BALANCE,
      accrualHistory: [],
      pendingRequests: [],
  }) },
  { method: 'GET', match: /^\/api\/leave\/request$/, handle: () => ({
      leaveRequests: world.leaveRequests.filter((r) => r.employee_id === ME.id),
  }) },
  { method: 'POST', match: /^\/api\/leave\/request$/, handle: ({ body }) => {
      const type = LEAVE_TYPES.find((t) => t.id === body?.leaveTypeId);
      const days = body?.startDate === body?.endDate ? 1 : 2;
      world.leaveRequests.unshift({
        id: `lr-${Date.now()}`,
        employee_id: ME.id,
        leave_type_id: body?.leaveTypeId,
        start_date: body?.startDate,
        end_date: body?.endDate,
        total_days: days,
        reason: body?.reason ?? null,
        status: 'pending',
        approved_by: null,
        approved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        leave_types: { name: type?.name ?? 'Leave' },
        employees: { full_name: ME.full_name },
      });
      return { success: true };
  } },
  { method: 'PATCH', match: /^\/api\/leave\/request$/, handle: ({ body }) => {
      const req = world.leaveRequests.find((r) => r.id === body?.requestId);
      if (req) req.status = 'cancelled';
      return { success: true };
  } },
  { method: 'POST', match: /^\/api\/leave\/accrual$/, handle: () => ({ success: true }) },
  { method: 'POST', match: /^\/api\/admin\/update-leave-balance$/, handle: () => ({ success: true }) },
  { method: 'GET', match: /^\/api\/giphy\/get-well$/, handle: () => ({ gifUrl: null }) },

  // ── Admin auth ───────────────────────────────────────────────────
  { method: 'GET', match: /^\/api\/admin\/check-auth$/, handle: () => ({ authenticated: true, message: 'Admin is authenticated' }) },
  { method: 'POST', match: /^\/api\/admin\/login$/, handle: () => ({ ok: true }) },
  { method: 'POST', match: /^\/api\/admin\/logout$/, handle: () => ({ ok: true }) },

  // ── Admin data ───────────────────────────────────────────────────
  { method: 'GET', match: /^\/api\/admin\/stats$/, handle: () => {
      const t = adminToday().attendance;
      return {
        totalEmployees: world.roster.length,
        activeToday: t.filter((r) => r.status === 'Active').length,
        officeCount: t.filter((r) => r.mode === 'office' && r.status !== 'Not Started').length,
        remoteCount: t.filter((r) => r.mode === 'remote' && r.status !== 'Not Started').length,
        averageHours: 8.3,
      };
  } },
  { method: 'GET', match: /^\/api\/admin\/today$/, handle: () => adminToday() },
  { method: 'GET', match: /^\/api\/admin\/users$/, handle: () =>
      world.roster.map((e) => ({ ...e, active: true, created_at: '2026-01-01T00:00:00Z', pin_hash: 'set', pin_change_required: false }))
  },
  { method: 'POST', match: /^\/api\/admin\/users$/, handle: ({ body }) => {
      const emp = {
        id: `dev-emp-${Date.now()}`,
        full_name: body?.fullName || 'New Person',
        slug: String(body?.fullName || 'new-person').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        email: body?.email || null,
      };
      world.roster.push(emp);
      return { ...publicEmployee(emp), message: 'added' };
  } },
  { method: 'PUT', match: /^\/api\/admin\/users$/, handle: ({ body }) => {
      const emp = world.roster.find((e) => e.id === body?.id);
      if (emp && body?.fullName) emp.full_name = body.fullName;
      return publicEmployee(emp ?? ME);
  } },
  { method: 'DELETE', match: /^\/api\/admin\/users$/, handle: () => ({ success: true }) },
  // Employee profile (about fields + document links)
  { method: 'GET', match: /^\/api\/admin\/employees\/[^/]+$/, handle: ({ url }) => {
      const empId = url.pathname.split('/').pop()!;
      const emp = world.roster.find((e) => e.id === empId) ?? ME;
      return {
        employee: { ...publicEmployee(emp), active: true, date_of_birth: '1996-04-18', phone: '+91 98110 12345', emergency_contact: 'Rohan (brother) · +91 98110 67890', created_at: '2026-01-01T00:00:00Z' },
        documents: [
          { id: 'doc-1', label: 'ID card', url: 'https://drive.google.com/drive/folders/demo-id', created_at: new Date().toISOString() },
          { id: 'doc-2', label: 'Payslip — Aug 2026', url: 'https://drive.google.com/drive/folders/demo-payslip', created_at: new Date().toISOString() },
        ],
      };
  } },
  { method: 'PATCH', match: /^\/api\/admin\/employees\/[^/]+$/, handle: ({ body }) => ({ employee: body ?? {} }) },
  { method: 'POST', match: /^\/api\/admin\/employees\/[^/]+$/, handle: ({ body, url }) => ({
      document: { id: `doc-${Date.now()}`, label: body?.label ?? 'Document', url: body?.url ?? '#', created_at: new Date().toISOString() },
  }) },
  { method: 'DELETE', match: /^\/api\/admin\/employees\/[^/]+$/, handle: () => ({ success: true }) },
  { method: 'GET', match: /^\/api\/admin\/birthdays$/, handle: () => ({
      birthdays: [{ name: 'Rahul Test', date: '12 Sep', inDays: 4 }],
  }) },
  { method: 'POST', match: /^\/api\/admin\/set-pin/, handle: () => ({ success: true, message: 'PIN set' }) },
  { method: 'DELETE', match: /^\/api\/admin\/set-pin/, handle: () => ({ success: true, message: 'PIN reset' }) },
  { method: 'GET', match: /^\/api\/admin\/leave-requests$/, handle: ({ url }) => {
      const status = url.searchParams.get('status');
      const rows = status && status !== 'all'
        ? world.leaveRequests.filter((r) => r.status === status)
        : world.leaveRequests;
      return { leaveRequests: rows };
  } },
  { method: 'POST', match: /^\/api\/admin\/leave-requests\/process/, handle: ({ body }) => {
      const req = world.leaveRequests.find((r) => r.id === body?.requestId);
      if (req) req.status = body?.action === 'approve' ? 'approved' : 'rejected';
      return { success: true };
  } },
  { method: 'GET', match: /^\/api\/admin\/attendance-report$/, handle: ({ url }) => attendanceReport(url.searchParams.get('startDate'), url.searchParams.get('endDate')) },
  { method: 'GET', match: /^\/api\/admin\/recent-activity$/, handle: ({ url }) =>
      recentActivity(url.searchParams.get('range'), url.searchParams.get('slug'))
  },
  { method: 'GET', match: /^\/api\/admin\/mood-data/, handle: () => ({
      moodData: world.sessions.slice(-14).map((s) => {
        const emp = world.roster.find((e) => e.id === s.employee_id)!;
        return {
          id: s.id, name: emp.full_name, slug: emp.slug,
          date: istDateKeyOfIso(s.checkin_ts),
          checkinTime: hhmm(s.checkin_ts),
          checkoutTime: s.checkout_ts ? hhmm(s.checkout_ts) : 'N/A',
          workedHours: '8h 10m', mood: s.mood, moodComment: s.mood_comment || '',
          mode: s.mode, dayOfWeek: 'Monday', employee_id: s.employee_id,
        };
      }),
  }) },
  { method: 'GET', match: /^\/api\/admin\/historical-data/, handle: () => ({ attendanceData: [] }) },
  { method: 'POST', match: /^\/api\/admin\/basecamp-announcement$/, handle: ({ body }) => ({
      ok: true,
      formattedMessage: `📣 Announcement\n\n${body?.message ?? ''}`,
  }) },
  { method: 'POST', match: /^\/api\/ai\/(insights|report|sentiment|notification|chat)$/, handle: ({ path }) => {
      if (path.includes('notification')) return { notification: 'Test mode: notifications are mocked locally.' };
      if (path.includes('sentiment')) return { sentiment: AI_TEXT };
      if (path.includes('report')) return { report: AI_TEXT };
      return { insights: AI_TEXT };
  } },
  { method: 'POST', match: /^\/api\/admin\/reset-sessions$/, handle: () => {
      if (world.openSession) {
        world.openSession.checkout_ts = new Date().toISOString();
        world.openSession = null;
      }
      return { success: true, message: 'All active sessions were checked out (mock).' };
  } },
];

/* ------------------------------------------------------------------ */
/* Installer                                                           */
/* ------------------------------------------------------------------ */

export function installDevBypass(): void {
  if (typeof window === 'undefined') return;
  const w = window as any;
  if (w.__INSYDE_DEV_BYPASS__) return;
  w.__INSYDE_DEV_BYPASS__ = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let path = '';
    let url: URL;
    try {
      url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url, window.location.origin);
      path = url.pathname;
    } catch {
      return originalFetch(input, init);
    }

    if (!path.startsWith('/api/')) return originalFetch(input, init);

    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const route = ROUTES.find((r) => r.method === method && r.match.test(path));
    if (!route) return originalFetch(input, init);

    // Simulate latency so loading states are visible
    await new Promise((resolve) => setTimeout(resolve, 180 + Math.random() * 260));

    let body: any;
    try {
      body = init?.body ? JSON.parse(String(init.body)) : undefined;
    } catch {
      body = undefined;
    }

    const result = route.handle({ path, url, body });
    const status = (result as any).status ?? 200;
    const payload = (result as any).body ?? result;
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  console.log(
    '%c[INSYDE dev bypass] Mock APIs active — no database calls. ' +
      'Log in as any seeded teammate (e.g. "Asha Dev") with PIN 1234. Admin: any credentials.',
    'color:#8d86d4;font-weight:bold;'
  );
}
