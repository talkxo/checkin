# INSYDE — Claude Code Project Plan

> **Stack:** Next.js 14 · TypeScript · Tailwind CSS · Supabase · Radix UI · Framer Motion
> **Live app:** insyde.talkxo.com
> **Repo:** github.com/talkxo/checkin
> **Last audited:** March 29, 2026

---

## Working Conventions

- **Never break existing functionality.** Each task is isolated. If a change touches `app/page.tsx` (1,532 lines), make surgical edits — do not rewrite the file.
- **IST timezone everywhere.** All time formatting must use `formatISTTimeShort()` or `formatISTTime()` from `lib/time.ts`. Never use `new Date().toLocaleTimeString()` directly.
- **Dark mode always works.** Every new UI element must have explicit `dark:` Tailwind variants.
- **Brand colour is `#6a63b6` (purple).** After Phase 1 Task P0-1 fixes `--primary`, use `text-primary`, `bg-primary`, `border-primary` tokens exclusively. Never use `bg-purple-600` or `text-purple-600` directly.
- **Framer Motion for animations.** The project already imports it. Use `motion.div` with `initial/animate/exit` props for any new animated elements.
- **Do not remove AI files.** When disabling AI features, comment out or gate with a flag — never delete `lib/ai.ts`, `components/ai-assistant.tsx`, `components/assistant-chat.tsx`, or any `/api/ai/*` route.
- **Run `npm run build` after each phase** to catch TypeScript errors before moving on.

---

## Phase 1 — UX Audit Bug Fixes

Work through these in priority order (P0 → P1 → P2 → P3). Each task has a clear acceptance test.

---

### P0-1 · Fix Brand Colour System (broken `--primary`)

**File:** `app/globals.css`

**Problem:** `--primary` is set to near-black navy in light mode and **orange** (`25 95% 53%`) in dark mode. The live site defaults to dark mode, so every primary action renders orange instead of the brand purple `#6a63b6`.

**Fix — replace both `:root` and `.dark` primary values:**

```css
/* In :root block */
--primary: 246 30% 55%;          /* #6a63b6 brand purple — light mode */
--primary-foreground: 0 0% 100%;

/* In .dark block */
--primary: 246 30% 65%;          /* slightly lighter for dark backgrounds */
--primary-foreground: 0 0% 100%;
```

**Also audit and replace** any direct `bg-purple-600` / `text-purple-600` classes across all component files — replace with `bg-primary` / `text-primary`. The Tailwind `purple-600` swatch (`#9333ea`) is perceptually very different from brand purple (`#6a63b6`).

**Do not touch** the green check-in button or red check-out button — these are intentional semantic colours (green = go, red = stop).

**Acceptance test:** Open the app in dark mode. The tab underlines, button fills, focus rings, and send button in the assistant should all appear purple, not orange.

---

### P0-2 · PIN Digits Shown in Plaintext

**File:** `components/pin-login.tsx`

**Problem:** Four PIN input boxes use `type="text"`. Digits are fully visible on screen.

**Fix:** Change each PIN `<Input>` to `type="password"` while keeping `inputMode="numeric"` and `pattern="[0-9]*"`:

```tsx
<Input
  type="password"         // ← was "text"
  inputMode="numeric"
  pattern="[0-9]*"
  maxLength={1}
  ...
/>
```

Apply this to all four PIN input fields in the component.

**Acceptance test:** Type a PIN — each digit shows as a bullet/dot on both desktop and mobile. The numeric keyboard still appears on mobile.

---

### P0-3 · PIN Auto-Submit Stale State Race Condition

**File:** `components/pin-login.tsx`

**Problem:** `handlePinSubmit` is called 100ms after the last digit via `setTimeout`, but reads `pin.join('')` from React state. State updates are async — the last digit hasn't committed yet. Result: "Please enter a 4-digit PIN" error with all four boxes visually filled.

**Fix — pass the assembled PIN directly:**

```tsx
// In handlePinDigitChange, find the auto-submit block and change to:
if (digit && index === 3) {
  const fullPin = newPin.join('');
  if (fullPin.length === 4) {
    setTimeout(() => handlePinSubmit(fullPin), 100); // pass fullPin directly
  }
}

// Update the function signature:
const handlePinSubmit = async (pinOverride?: string) => {
  const fullPin = pinOverride ?? pin.join('');
  if (!fullPin || fullPin.length !== 4) {
    setError('Please enter a 4-digit PIN');
    return;
  }
  // rest of function unchanged, use fullPin instead of pin.join('')
};
```

**Acceptance test:** Fill all 4 PIN digits rapidly — auto-submits without error. Button-submit also works (no `pinOverride` passed).

---

### P1-1 · Wrong Timezone on Check-in Clock and Chat Timestamps

**Files:** `app/page.tsx` (line 1179), `components/assistant-chat.tsx`

**Problem:** The live clock on the check-in button uses `toLocaleTimeString('en-GB', ...)` which renders UTC, not IST. `formatISTTimeShort` is already defined at the top of `page.tsx` (line 34) but not applied here.

**Fix in `app/page.tsx`** — line 1179:

```tsx
// Before:
`Check In at ${currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`

// After:
`Check In at ${formatISTTimeShort(currentTime.toISOString())}`
```

Apply the same to the check-out label if it also shows a timestamp.

**Fix in `components/assistant-chat.tsx`** — find where `message.timestamp` is rendered and wrap:

```tsx
import { formatISTTimeShort } from '@/lib/time';
// Replace raw timestamp display with:
<span>{formatISTTimeShort(message.timestamp)}</span>
```

**Acceptance test:** At any time of day, the check-in button shows IST time (UTC+5:30). 9:30 AM IST → `Check In at 09:30`, never `04:00`.

---

### P1-2 · Calendar: Add Date Numbers and Legend

**File:** `components/attendance-history.tsx`

**Problem:** Calendar cells show no date numbers. No legend explaining what colours mean.

**Fix — date numbers inside cells:**

```tsx
<div className="relative w-8 h-8 rounded-md ...">
  <span className="absolute top-0.5 left-1 text-[9px] text-muted-foreground leading-none">
    {cellDate.getDate()}
  </span>
  {/* existing cell content */}
</div>
```

**Fix — legend below the calendar:**

```tsx
<div className="flex items-center gap-4 mt-3 flex-wrap">
  <div className="flex items-center gap-1.5">
    <span className="w-3 h-3 rounded-sm bg-primary inline-block" />
    <span className="text-xs text-muted-foreground">Office</span>
  </div>
  <div className="flex items-center gap-1.5">
    <span className="w-3 h-3 rounded-sm bg-sky-500 inline-block" />
    <span className="text-xs text-muted-foreground">Remote</span>
  </div>
  <div className="flex items-center gap-1.5">
    <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
    <span className="text-xs text-muted-foreground">Leave</span>
  </div>
  <div className="flex items-center gap-1.5">
    <span className="w-3 h-3 rounded-sm bg-muted inline-block" />
    <span className="text-xs text-muted-foreground">No data</span>
  </div>
  <div className="flex items-center gap-1.5">
    <span className="w-3 h-3 rounded-sm bg-border inline-block" />
    <span className="text-xs text-muted-foreground">Weekend</span>
  </div>
</div>
```

Cell fill colours must match legend: Office → `bg-primary`, Remote → `bg-sky-500`, Leave → `bg-amber-500`, no-data → `bg-muted`, today → ring only.

**Acceptance test:** Each cell shows a small date number. 5-item legend visible below the calendar.

---

### P1-3 · Page Layout Fragmentation

**Files:** `app/leave/page.tsx`, new `components/page-shell.tsx`

**Problem:** Three pages use three different max-widths. The Leave page has amber/orange gradient card borders that look like a different product.

**Fix — create a reusable layout wrapper:**

Create `components/page-shell.tsx`:

```tsx
interface PageShellProps {
  children: React.ReactNode;
  variant?: 'narrow' | 'wide';
}

export function PageShell({ children, variant = 'narrow' }: PageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className={`mx-auto px-4 py-6 ${variant === 'wide' ? 'max-w-4xl' : 'max-w-md'}`}>
        {children}
      </div>
    </div>
  );
}
```

**Apply to Leave page:**
- Wrap content in `<PageShell variant="wide">`
- Search `leave-management.tsx` for `amber`, `orange`, `gradient` class names and replace card borders with `border border-border/50`

**Main page remains `max-w-md` (narrow). Admin stays as-is.**

**Acceptance test:** Navigate to `/leave`. Feels visually consistent with the main app — same card style, no amber glows, same border radius.

---

### P1-4 · House Icon → Labelled Office/Remote Toggle

**File:** `app/page.tsx` (lines 1142–1151)

**Problem:** The square icon button with `fa-building` / `fa-home` has no label, tooltip, or visible current state.

**Fix — replace with a pill toggle, placed above the check-in button (full width row on its own):**

```tsx
<div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5 w-fit">
  <button
    onClick={() => { setMode('office'); localStorage.setItem('mode', 'office'); }}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
      mode === 'office'
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'
    }`}
  >
    <i className="fas fa-building text-xs" />
    Office
  </button>
  <button
    onClick={() => { setMode('remote'); localStorage.setItem('mode', 'remote'); }}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
      mode === 'remote'
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'
    }`}
  >
    <i className="fas fa-home text-xs" />
    Remote
  </button>
</div>
```

The check-in hold button then spans full width on its own row below this toggle.

**Acceptance test:** Mode toggle is immediately legible with a visible active state. Switching updates check-in context correctly.

---

### P2-1 · Bottom Navigation Bar

**File:** `app/page.tsx`

**Problem:** "Manage Leaves" is buried in the footer (lines 1494–1514). Top tabs (lines 1090–1121) are styled inconsistently and the Assistant tab is being removed.

**Fix — three steps:**

**Step 1 — Remove** the top tab row (lines 1090–1121, the `flex gap-1 border-b border-border/50 mb-6` div with three `<button>` elements).

**Step 2 — Remove** the footer section (lines 1494–1514, the `mt-8 pt-6 border-t` div).

**Step 3 — Add** a sticky bottom nav inside the logged-in view:

```tsx
{isLoggedIn && (
  <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border/50">
    <div className="max-w-md mx-auto flex items-center justify-around px-2 py-1.5">
      {[
        { id: 'control', icon: 'fa-house-chimney', label: 'Control' },
        { id: 'snapshot', icon: 'fa-chart-bar', label: 'Snapshot' },
        { id: 'plan', icon: 'fa-calendar-week', label: 'Plan' },
      ].map((tab) => (
        <button key={tab.id}
          onClick={() => setActiveTab(tab.id as any)}
          className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
            activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}>
          <i className={`fas ${tab.icon} text-lg`} />
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
      <Link href="/leave"
        className="flex flex-col items-center gap-0.5 px-4 py-1 text-muted-foreground hover:text-foreground transition-colors">
        <i className="fas fa-calendar-days text-lg" />
        <span className="text-[10px] font-medium">Leave</span>
      </Link>
      <div className="flex flex-col items-center gap-0.5 px-4 py-1">
        <DarkModeToggle />
        <span className="text-[10px] font-medium text-muted-foreground">Theme</span>
      </div>
      <button onClick={handleLogout}
        className="flex flex-col items-center gap-0.5 px-4 py-1 text-muted-foreground hover:text-foreground transition-colors">
        <LogOut className="w-[18px] h-[18px]" />
        <span className="text-[10px] font-medium">Logout</span>
      </button>
    </div>
  </nav>
)}
```

**Step 4 — Update `activeTab` type** (remove `'assistant'`, add `'plan'`):

```tsx
const [activeTab, setActiveTab] = useState<'control' | 'snapshot' | 'plan'>('control');
```

**Step 5 — Add `pb-20`** to the main content wrapper so content isn't hidden behind the fixed bar.

**Acceptance test:** Bottom nav is sticky on mobile and desktop. Control/Snapshot/Plan switch views. Leave navigates to `/leave`. Active item glows purple.

---

### P2-2 · Metric Tooltips + Deep Score Progress Bar

**File:** `app/page.tsx` — Overview section (lines 1300–1369)

**Problem:** "Deep Score: 1.10 / 42", "No-Fill Days: 13", "Average Time: 10:45" are opaque to new users.

**Fix — add a `ⓘ` tooltip to each card using Radix UI Tooltip (already in project):**

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

// Wrap each card with a label + tooltip above it:
<div className="space-y-1">
  <div className="flex items-center gap-1 px-1">
    <span className="text-xs font-medium text-muted-foreground">Deep Score</span>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="text-muted-foreground hover:text-foreground">
            <Info className="w-3 h-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs max-w-[180px]">
            Your punctuality score this quarter. Higher = more on-time check-ins. Max is 42.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
  <OverviewCard ... />
</div>
```

**Tooltip copy:**
- **Deep Score** → "Your punctuality score this quarter. Higher = more on-time check-ins. Max is 42."
- **No-Fill Days** → "Working days this month where no check-in was recorded."
- **Average Time** → "Your average check-in time this month."

**Add a micro progress bar under the Deep Score card:**

```tsx
<div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
  <div className="h-full bg-primary rounded-full transition-all"
    style={{ width: `${Math.min(((punctualityStats?.punctualityScore ?? 0) / 42) * 100, 100)}%` }} />
</div>
```

**Acceptance test:** Hovering/tapping the ⓘ icon shows a concise tooltip. Deep Score card has a small purple progress bar.

---

### P2-3 · Snapshot Tab — Rebuild as Team Pulse

**File:** `app/page.tsx` — `activeTab === 'snapshot'` section (lines 1386–1489)

**Problem:** Tab is near-empty. The accordion (lines 1401–1486) uses hardcoded light-mode colours (`text-gray-900`, `border-gray-200`, `hover:bg-gray-50`) — invisible in dark mode.

**Fix — four clear sections:**

```tsx
{/* 1. Who's in today */}
<div>
  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Today</h3>
  <TodayPresenceCard />
</div>

{/* 2. Personal streak */}
<div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 border border-border/50">
  <span className="text-2xl">🔥</span>
  <div>
    <p className="text-sm font-semibold text-foreground">{streak}-day streak</p>
    <p className="text-xs text-muted-foreground">Consecutive days with a check-in</p>
  </div>
</div>

{/* 3. Recent sessions — in a visible border */}
<div className="border border-border rounded-xl overflow-hidden">
  <RecentActivity userSlug={selectedEmployee?.slug || localStorage.getItem('userSlug') || undefined} />
</div>

{/* 4. Pending leave (admin only) */}
{me?.is_admin && pendingLeaveCount > 0 && (
  <Link href="/admin"
    className="flex items-center justify-between px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
    <span className="text-sm font-medium text-foreground">Leave requests pending</span>
    <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
      {pendingLeaveCount}
    </span>
  </Link>
)}
```

**Streak computation** (add to page.tsx, computed from existing `recentActivity` data after it loads):

```tsx
const computeStreak = (activity: any[]) => {
  const dates = [...new Set(
    activity.map(a =>
      new Date(a.checkin_ts).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    )
  )].sort().reverse();

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const dateStr of dates) {
    const d = new Date(dateStr);
    if (d.getDay() === 0 || d.getDay() === 6) { cursor = d; continue; }
    const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000);
    if (diff <= 1) { streak++; cursor = d; }
    else break;
  }
  return streak;
};
```

Store as `const [streak, setStreak] = useState(0)`.

**Dark mode fix on any remaining accordion:** replace all:
- `text-gray-900` → `text-foreground`
- `border-gray-200` → `border-border`
- `hover:bg-gray-50` → `hover:bg-muted/50`

**Acceptance test:** Snapshot tab shows presence card, streak pill, recent sessions in bordered card. All visible in dark mode.

---

### P2-4 · Weekend Check-in Warning

**File:** `app/page.tsx`

**Problem:** On weekends the app shows "Check In at 02:18" with no indication it's a non-working day.

**Fix:**

```tsx
import { isWorkDay } from '@/lib/time';

// Above the mode toggle in the Control tab:
{!isWorkDay(new Date()) && (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-2 text-sm bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-lg px-3 py-2 mb-3"
  >
    <span>⚠️</span>
    <span>Today is {new Date().toLocaleDateString('en-IN', { weekday: 'long' })}. Checking in on a non-working day?</span>
  </motion.div>
)}
```

Keep the check-in button enabled — some people work weekends.

**Acceptance test:** On Saturday/Sunday, amber banner appears above the mode toggle. On weekdays, not visible.

---

### P3-1 · Remove Debug `console.log` Statements

**Files:** `app/page.tsx`, `components/assistant-chat.tsx`, `components/ai-assistant.tsx`, `lib/ai.ts`

**Fix:** Remove or gate with `if (process.env.NODE_ENV === 'development')` all of:
```
'=== SESSION RESTORE DEBUG ==='
'Setting name from session:'
'Restored savedName from localStorage:'
'Restored savedSlug from localStorage:'
'Generating AI notification for context:'
'AI notification received:'
'Date selected:'
```

**Acceptance test:** Production build DevTools Console — zero INSYDE-related logs during normal use.

---

### P3-2 · Fix `scale-102` Tailwind Class

**File:** `tailwind.config.js`

**Fix:**

```js
theme: {
  extend: {
    scale: { '102': '1.02' },
  },
},
```

**Acceptance test:** Check-in button subtly scales on hover. Confirm `transform: scale(1.02)` in DevTools.

---

### P3-3 · Remove CSV File from Repo

**File:** `employee-pins-2025-12-05.csv`

**Steps (1 and 2 immediately; 3 only after Rishi confirms):**
1. Add `*.csv` to `.gitignore`
2. `git rm employee-pins-2025-12-05.csv`
3. **Needs confirmation:** `git filter-repo --path employee-pins-2025-12-05.csv --invert-paths` + force-push

**Acceptance test:** `git ls-files` shows no CSV. `.gitignore` blocks future CSV commits.

---

## Phase 2 — Tab & Dashboard Reorganisation

This phase defines what lives where. Every piece of information gets a clear home. The result is a Control tab that is focused and actionable, a Snapshot tab that is social and insightful, and a new Plan tab that is simple and useful.

---

### Information Architecture

```
Bottom Nav: [Control]  [Snapshot]  [Plan]  [Leave →]  [Theme]  [Logout]

────────────────────────────────────────────────────────
CONTROL TAB
────────────────────────────────────────────────────────
  Greeting: "What's up, Rishi!"
  ──
  [Weekend warning banner]          ← amber, conditional
  [WFH plan nudge banner]           ← purple, until week is filled
    OR compact week strip           ← shown once plan is saved
  ──
  Office / Remote pill toggle
  Check-in / Check-out hold button  ← full width
  System message (msg only)         ← no AI content
  ──
  Today's Presence strip            ← simple one-liner: 🏢 Arjun · 🏠 Priya
  ──
  Overview section
    Deep Score    [ⓘ]  [▓▓▓░░ progress bar]
    No-Fill Days  [ⓘ]
    Average Time  [ⓘ]  [status badge]
  ──
  Attendance History calendar
    (date numbers in cells + legend below)

────────────────────────────────────────────────────────
SNAPSHOT TAB
────────────────────────────────────────────────────────
  "Today" section
    TodayPresenceCard
      🏢 In office: Arjun, Meera
      🏠 Remote: Priya
  ──
  🔥 5-day streak pill
  ──
  "Recent Sessions" (RecentActivity in bordered card)
  ──
  [Pending leave badge]             ← admin only

────────────────────────────────────────────────────────
PLAN TAB  (new — replaces disabled Assistant)
────────────────────────────────────────────────────────
  "This week's plan"
  Mon  Tue  Wed  Thu  Fri           ← interactive pill toggles
  [WFH] [   ] [WFH] [   ] [   ]
  [Save plan button]                ← only when unsaved changes
  ✓ Plan saved for this week
  ──
  Team's plan this week
  Arjun:  M · · W ·                ← compact dot strips
  Priya:  · T · · F
```

---

### TAB-1 · Control Tab — Clean Up the Hero Area

**File:** `app/page.tsx`

Remove the hard divider between the check-in area and Overview (line 1298: `<div className="my-8 h-px bg-border" />`). The Overview section header provides the natural visual break. Replace with a simple `mt-6` on the Overview wrapper.

Simplify the `msg` display block (lines 1273–1295). Since AI is disabled, this block only ever shows system messages now. Replace with:

```tsx
{msg && (
  <motion.div
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="text-sm text-foreground bg-muted/60 border border-border/50 rounded-xl px-4 py-3"
  >
    {msg}
  </motion.div>
)}
```

Remove the AI notification state/display entirely from this block (handled by the Feature 1 AI disable gate).

---

### TAB-2 · Control Tab — Today's Presence Strip

**New file:** `components/presence-strip.tsx`

A minimal inline component: no card, no table — just a sentence with emoji groups showing first names. This is the "simple line" that highlights who's in/WFH today.

```tsx
'use client';
import { useEffect, useState } from 'react';

interface Person { name: string; mode: 'office' | 'remote'; }

export default function PresenceStrip() {
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    fetch('/api/admin/today')
      .then(r => r.json())
      .then(data => {
        const active = (data.attendance || [])
          .filter((r: any) => r.status === 'In' || r.status === 'Complete')
          .map((r: any) => ({ name: r.name.split(' ')[0], mode: r.mode }));
        setPeople(active);
      })
      .catch(() => {});
  }, []);

  if (people.length === 0) return null;

  const inOffice = people.filter(p => p.mode === 'office');
  const remote = people.filter(p => p.mode === 'remote');

  return (
    <div className="border-l-2 border-primary/30 pl-3 py-0.5 space-y-0.5">
      {inOffice.length > 0 && (
        <p className="text-xs text-muted-foreground">
          🏢 <span className="text-foreground">{inOffice.map(p => p.name).join(', ')}</span>
        </p>
      )}
      {remote.length > 0 && (
        <p className="text-xs text-muted-foreground">
          🏠 <span className="text-foreground">{remote.map(p => p.name).join(', ')}</span>
        </p>
      )}
    </div>
  );
}
```

Place `<PresenceStrip />` in the Control tab directly after the `msg` display block, before the Overview section.

---

### TAB-3 · Snapshot Tab — Streak

Add `const [streak, setStreak] = useState(0)` to `app/page.tsx`. After `recentActivity` data loads, compute and set streak using the `computeStreak()` function defined in P2-3. Render as the 🔥 streak pill in the Snapshot tab.

---

### TAB-4 · Snapshot Tab — Today Presence Card

**New file:** `components/today-presence-card.tsx`

Slightly fuller than the strip: shows grouped rows in a bordered card with labels. Uses the same `/api/admin/today` endpoint.

```tsx
'use client';
import { useEffect, useState } from 'react';

export default function TodayPresenceCard() {
  const [inOffice, setInOffice] = useState<string[]>([]);
  const [remote, setRemote] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/today')
      .then(r => r.json())
      .then(data => {
        const active = (data.attendance || []).filter((r: any) =>
          r.status === 'In' || r.status === 'Complete'
        );
        setInOffice(active.filter((r: any) => r.mode === 'office').map((r: any) => r.name.split(' ')[0]));
        setRemote(active.filter((r: any) => r.mode === 'remote').map((r: any) => r.name.split(' ')[0]));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-12 bg-muted/40 rounded-xl animate-pulse" />;

  if (inOffice.length === 0 && remote.length === 0) {
    return <p className="text-sm text-muted-foreground px-1">No one's checked in yet today.</p>;
  }

  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 divide-y divide-border/50">
      {inOffice.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3">
          <span className="text-base mt-0.5">🏢</span>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5">In office</p>
            <p className="text-sm text-foreground">{inOffice.join(' · ')}</p>
          </div>
        </div>
      )}
      {remote.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3">
          <span className="text-base mt-0.5">🏠</span>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5">Remote</p>
            <p className="text-sm text-foreground">{remote.join(' · ')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Phase 3 — New Features

---

### Feature 1 · Disable AI (User-Facing Only)

**Goal:** Hide all AI from the user-facing main site. Reversible with one flag. No files deleted.

**File to change: `app/page.tsx` only.**

#### Step 1 — Feature flag at the top of `app/page.tsx`:

```tsx
// Feature flags — set to true to re-enable
const FEATURE_AI_ENABLED = false;
```

#### Step 2 — Gate all `generateSmartNotification` calls:

Search `app/page.tsx` for `generateSmartNotification(` (two locations: hold handler ~line 397, `act()` after check-in ~line 658). Wrap each:

```tsx
if (FEATURE_AI_ENABLED) generateSmartNotification(context);
```

Gate the greeting message generation similarly:

```tsx
if (FEATURE_AI_ENABLED) generateGreetingMessage();
```

#### Step 3 — Gate `<AssistantChat>` render:

```tsx
{FEATURE_AI_ENABLED && activeTab === 'assistant' && (
  <AssistantChat isVisible={true} userSlug={selectedEmployee?.slug} />
)}
```

#### Step 4 — The bottom nav built in P2-1 already omits the Assistant tab.

Confirm `activeTab` type does not include `'assistant'`.

**What stays active:** All `/api/ai/*` routes, `lib/ai.ts`, both AI components, admin AI Insights tab — all untouched.

**Acceptance test:** No AI notification appears on check-in. No Assistant tab visible. DevTools Network shows zero `/api/ai/*` calls during normal use.

---

### Feature 2 · Push Notification System (Build from Scratch)

**Context:** No push notification infrastructure exists in the codebase today — no service worker, no `web-push` dependency, no PWA manifest, no subscription table. This builds it entirely.

#### Step 1 — Install

```bash
npm install web-push
npm install --save-dev @types/web-push
```

#### Step 2 — Generate VAPID keys (run once)

```bash
npx web-push generate-vapid-keys
```

Add to `.env.local` and Vercel project settings:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public-key>
VAPID_PRIVATE_KEY=<private-key>
VAPID_EMAIL=mailto:admin@talkxo.com
NEXT_PUBLIC_APP_URL=https://insyde.talkxo.com
CRON_SECRET=<random-string>
```

#### Step 3 — Create service worker

Create `public/sw.js`:

```js
self.addEventListener('push', function(event) {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/insyde-logo.png',
      badge: '/insyde-logo.png',
      tag: data.tag || 'insyde-notification',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data.url);
    })
  );
});
```

#### Step 4 — Supabase table

```sql
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
```

#### Step 5 — Subscribe endpoint

Create `app/api/push/subscribe/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { subscription, employeeId } = await req.json();
  if (!subscription?.endpoint || !employeeId)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  await supabase.from('push_subscriptions').upsert({
    employee_id: employeeId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  }, { onConflict: 'endpoint' });

  return NextResponse.json({ ok: true });
}
```

#### Step 6 — Send endpoint

Create `app/api/push/send/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { employeeId, title, body, url, tag } = await req.json();
  const { data: subs } = await supabase
    .from('push_subscriptions').select('*').eq('employee_id', employeeId);

  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const payload = JSON.stringify({ title, body, url: url || '/', tag });
  let sent = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
    } catch (err: any) {
      // Clean up expired or invalid subscriptions
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }
  }

  return NextResponse.json({ sent });
}
```

#### Step 7 — Register SW after login

In `app/page.tsx`, add a `useEffect` that fires when `isLoggedIn` becomes true:

```tsx
// Helper — add near top of file:
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

useEffect(() => {
  if (!isLoggedIn || !me?.id) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const registerPush = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const existing = await reg.pushManager.getSubscription();
      const sub = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), employeeId: me.id }),
      });
    } catch (err) {
      console.warn('Push registration failed:', err);
    }
  };

  registerPush();
}, [isLoggedIn, me?.id]);
```

#### Step 8 — Trigger push on check-in / check-out

In `act()`, after successful API response (fire-and-forget):

```tsx
// After successful check-in:
fetch('/api/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    employeeId: me?.id,
    title: 'Checked in ✅',
    body: `You checked in at ${formatISTTimeShort(new Date().toISOString())}`,
    tag: 'checkin',
  }),
}).catch(() => {});

// After successful check-out:
fetch('/api/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    employeeId: me?.id,
    title: 'Checked out 👋',
    body: `See you tomorrow!`,
    tag: 'checkout',
  }),
}).catch(() => {});
```

#### Step 9 — Monday WFH reminder cron

Create `app/api/cron/wfh-reminder/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date();
  if (today.getDay() !== 1) return NextResponse.json({ skipped: true });

  // Get Monday date string
  const weekStart = today.toISOString().split('T')[0];

  const { data: employees } = await supabase.from('employees').select('id').eq('active', true);
  const { data: existing } = await supabase
    .from('wfh_schedule').select('employee_id').eq('week_start', weekStart);

  const filledIds = new Set((existing || []).map((r: any) => r.employee_id));
  const needReminder = (employees || []).filter((e: any) => !filledIds.has(e.id));

  for (const emp of needReminder) {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: emp.id,
        title: '📅 Plan your week',
        body: "Mark your WFH days so the team knows where you'll be.",
        url: '/',
        tag: 'wfh-reminder',
      }),
    });
  }

  return NextResponse.json({ reminded: needReminder.length });
}
```

Update `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/auto-checkout", "schedule": "0 18 * * *" },
    { "path": "/api/cron/wfh-reminder", "schedule": "30 3 * * 1" }
  ]
}
```

**Acceptance test:** After login, browser requests notification permission. On grant, check in — a push notification appears within 2 seconds. On Monday morning, employees without a WFH schedule receive a push reminder.

---

### Feature 3 · WFH Weekly Planner

**Goal:** Let users mark their WFH days for the current week. Surface a persistent nudge on the dashboard when the week is unfilled. Show the plan everywhere it's relevant.

#### Step 1 — Database migration

```sql
CREATE TABLE wfh_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  wfh_days text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, week_start)
);
ALTER TABLE wfh_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read wfh_schedule" ON wfh_schedule FOR SELECT USING (true);
```

#### Step 2 — Add `getMondayOfWeek` to `lib/time.ts`

```ts
export function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0]; // 'YYYY-MM-DD'
}
```

#### Step 3 — WFH Schedule API

Create `app/api/wfh-schedule/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET ?week=2026-03-30 or ?week=2026-03-30&employeeId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const week = searchParams.get('week');
  const employeeId = searchParams.get('employeeId');

  let query = supabase
    .from('wfh_schedule')
    .select('*, employees(full_name, slug)')
    .eq('week_start', week);

  if (employeeId) query = query.eq('employee_id', employeeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { employeeId, weekStart, wfhDays } = await req.json();
  const { data, error } = await supabase
    .from('wfh_schedule')
    .upsert(
      { employee_id: employeeId, week_start: weekStart, wfh_days: wfhDays, updated_at: new Date().toISOString() },
      { onConflict: 'employee_id,week_start' }
    )
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
```

#### Step 4 — WeekStrip shared component

Create `components/week-strip.tsx`:

```tsx
'use client';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

interface WeekStripProps {
  wfhDays: string[];
  size?: 'full' | 'compact';
  onToggle?: (day: string) => void;
}

export default function WeekStrip({ wfhDays, size = 'full', onToggle }: WeekStripProps) {
  const today = new Date();
  const todayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][today.getDay()];

  if (size === 'compact') {
    return (
      <div className="flex items-center gap-2">
        {DAYS.map(day => {
          const isWFH = wfhDays.includes(day);
          const isToday = day === todayName;
          return (
            <div key={day} className="flex flex-col items-center gap-0.5">
              <span className={`w-2 h-2 rounded-full ${isWFH ? 'bg-primary' : 'bg-muted-foreground/30'} ${
                isToday ? 'ring-2 ring-primary/50 ring-offset-1 ring-offset-background' : ''
              }`} />
              <span className={`text-[9px] font-medium ${isToday ? 'text-foreground' : 'text-muted-foreground'}`}>
                {day[0]}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {DAYS.map(day => {
        const isWFH = wfhDays.includes(day);
        const isToday = day === todayName;
        const Tag = onToggle ? 'button' : 'div';
        return (
          <Tag
            key={day}
            onClick={onToggle ? () => onToggle(day) : undefined}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all text-center
              ${isWFH ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-transparent hover:border-border'}
              ${isToday ? 'ring-2 ring-primary/40 ring-offset-2 ring-offset-background' : ''}
              ${onToggle ? 'cursor-pointer active:scale-95' : 'cursor-default'}
            `}
          >
            <span className="block">{day}</span>
            {isWFH && <span className="block text-[9px] opacity-70 mt-0.5">WFH</span>}
          </Tag>
        );
      })}
    </div>
  );
}
```

**Behaviour:** WFH → filled purple pill with "WFH" sub-label. Non-WFH → muted (implicitly office). Today's column always has a subtle ring. `compact` renders tiny dots for inline use.

#### Step 5 — Plan Tab component

Create `components/wfh-planner-tab.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import WeekStrip from './week-strip';
import { getMondayOfWeek } from '@/lib/time';

interface WFHPlannerTabProps {
  employeeId: string;
  onScheduleSaved?: (days: string[]) => void;
}

export default function WFHPlannerTab({ employeeId, onScheduleSaved }: WFHPlannerTabProps) {
  const [wfhDays, setWfhDays] = useState<string[]>([]);
  const [savedDays, setSavedDays] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const weekStart = getMondayOfWeek(new Date());

  useEffect(() => {
    fetch(`/api/wfh-schedule?week=${weekStart}&employeeId=${employeeId}`)
      .then(r => r.json())
      .then(({ data }) => {
        if (data?.length > 0) {
          setWfhDays(data[0].wfh_days || []);
          setSavedDays(data[0].wfh_days || []);
          setSaved(true);
        }
      });
  }, [employeeId, weekStart]);

  const toggleDay = (day: string) => {
    setSaved(false);
    setWfhDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const saveSchedule = async () => {
    setSaving(true);
    await fetch('/api/wfh-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, weekStart, wfhDays }),
    });
    setSavedDays(wfhDays);
    setSaving(false);
    setSaved(true);
    onScheduleSaved?.(wfhDays);
  };

  const hasChanges = JSON.stringify([...wfhDays].sort()) !== JSON.stringify([...savedDays].sort());

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">This week's plan</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Tap the days you'll be working from home.</p>
      </div>

      <WeekStrip wfhDays={wfhDays} size="full" onToggle={toggleDay} />

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />
          <span>WFH</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-muted inline-block border border-border" />
          <span>Office</span>
        </div>
      </div>

      {hasChanges && (
        <motion.button
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          onClick={saveSchedule} disabled={saving}
          className="w-full py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save plan'}
        </motion.button>
      )}

      {saved && !hasChanges && (
        <p className="text-xs text-muted-foreground text-center">✓ Plan saved for this week</p>
      )}

      <div className="border-t border-border/50 pt-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Team's plan this week</p>
        <TeamWeekView weekStart={weekStart} />
      </div>
    </motion.div>
  );
}

function TeamWeekView({ weekStart }: { weekStart: string }) {
  const [team, setTeam] = useState<{ name: string; wfhDays: string[] }[]>([]);

  useEffect(() => {
    fetch(`/api/wfh-schedule?week=${weekStart}`)
      .then(r => r.json())
      .then(({ data }) => {
        setTeam((data || []).map((row: any) => ({
          name: row.employees?.full_name?.split(' ')[0] || '?',
          wfhDays: row.wfh_days || [],
        })));
      });
  }, [weekStart]);

  if (!team.length)
    return <p className="text-xs text-muted-foreground">No team members have set their plan yet.</p>;

  return (
    <div className="space-y-3">
      {team.map(member => (
        <div key={member.name} className="flex items-center gap-3">
          <span className="text-xs text-foreground w-16 truncate">{member.name}</span>
          <WeekStrip wfhDays={member.wfhDays} size="compact" />
        </div>
      ))}
    </div>
  );
}
```

#### Step 6 — Persistent dashboard banner + state in `app/page.tsx`

Add state:

```tsx
const [weeklyPlanFilled, setWeeklyPlanFilled] = useState(true); // optimistic: assume filled
const [weeklyPlanDays, setWeeklyPlanDays] = useState<string[]>([]);
```

Fetch on login:

```tsx
useEffect(() => {
  if (!isLoggedIn || !me?.id) return;
  const weekStart = getMondayOfWeek(new Date());
  fetch(`/api/wfh-schedule?week=${weekStart}&employeeId=${me.id}`)
    .then(r => r.json())
    .then(({ data }) => {
      if (data?.length > 0) {
        setWeeklyPlanFilled(true);
        setWeeklyPlanDays(data[0].wfh_days || []);
      } else {
        setWeeklyPlanFilled(false);
      }
    });
}, [isLoggedIn, me?.id]);
```

Render in Control tab, between the greeting and the mode toggle. **No dismiss button — only filling in the plan clears it:**

```tsx
{/* WFH Plan nudge — stays until week is filled */}
{!weeklyPlanFilled && (
  <motion.div
    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
    className="border border-primary/30 bg-primary/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
  >
    <div>
      <p className="text-sm font-medium text-foreground">Plan your week 📅</p>
      <p className="text-xs text-muted-foreground mt-0.5">Let the team know when you're at home.</p>
    </div>
    <button
      onClick={() => setActiveTab('plan')}
      className="shrink-0 text-xs font-medium text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
    >
      Fill in →
    </button>
  </motion.div>
)}

{/* Compact week strip — shown once plan is saved */}
{weeklyPlanFilled && weeklyPlanDays.length > 0 && (
  <div className="flex items-center gap-3 px-1">
    <span className="text-xs text-muted-foreground shrink-0">This week</span>
    <WeekStrip wfhDays={weeklyPlanDays} size="compact" />
  </div>
)}
```

#### Step 7 — Wire Plan tab in `app/page.tsx`

```tsx
{activeTab === 'plan' && me && (
  <WFHPlannerTab
    employeeId={me.id}
    onScheduleSaved={(days) => {
      setWeeklyPlanFilled(true);
      setWeeklyPlanDays(days);
    }}
  />
)}
```

**Acceptance tests:**
- "Plan" tab in bottom nav, calendar-week icon
- Mon–Fri pills toggle purple (WFH) / muted (office)
- "Save plan" appears only with unsaved changes
- After save: "✓ Plan saved", team section updates
- Dashboard: purple-bordered nudge until plan is saved; then compact dot strip
- Today's column always has a subtle ring

---

### Feature 4 · Reward Animations on Check-in / Check-out

**Goal:** A brief burst of delight on successful check-in/check-out. No heavy libraries.

#### Step 1 — Install

```bash
npm install canvas-confetti
npm install --save-dev @types/canvas-confetti
```

#### Step 2 — Create reward helpers

Create `lib/use-reward.ts`:

```ts
import confetti from 'canvas-confetti';

export function fireCheckInConfetti() {
  confetti({
    particleCount: 60,
    spread: 70,
    origin: { y: 0.75 },
    colors: ['#6a63b6', '#9b95d3', '#ffffff', '#a5f3fc'],
    scalar: 0.8,
    gravity: 1.2,
  });
}

export function fireCheckOutConfetti() {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.75 },
    colors: ['#6a63b6', '#e2e8f0'],
    scalar: 0.6,
    gravity: 1.5,
  });
}
```

#### Step 3 — Trigger in `act()`

```tsx
import { fireCheckInConfetti, fireCheckOutConfetti } from '@/lib/use-reward';

// After successful check-in API response:
fireCheckInConfetti();

// After successful check-out API response:
fireCheckOutConfetti();
```

#### Step 4 — Button success pulse

```tsx
const [checkInSuccess, setCheckInSuccess] = useState(false);

// After successful check-in:
setCheckInSuccess(true);
setTimeout(() => setCheckInSuccess(false), 1000);
```

```tsx
<motion.button
  animate={checkInSuccess ? { scale: [1, 1.08, 1] } : {}}
  transition={{ duration: 0.4 }}
  className={`... ${checkInSuccess ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-background' : ''}`}
>
```

#### Step 5 — Haptic feedback (mobile)

```tsx
if (navigator.vibrate) {
  navigator.vibrate(action === 'checkin' ? [50, 30, 50] : [80]);
}
```

**Acceptance test:** Confetti bursts in brand purple on check-in. Button pulses with a green ring. On supported mobile, short vibration felt. Check-out fires a quieter burst.

---

## Database Migrations Summary

Run in Supabase SQL editor, in order:

```sql
-- 1. Push subscriptions (Feature 2)
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. WFH schedule (Feature 3)
CREATE TABLE wfh_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  wfh_days text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, week_start)
);
ALTER TABLE wfh_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read wfh_schedule" ON wfh_schedule FOR SELECT USING (true);
```

---

## Environment Variables

Add to `.env.local` and Vercel project settings:

```
# Existing — keep as-is
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=            # keep even while AI is disabled

# New — Push Notifications (Feature 2)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=  # npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:admin@talkxo.com
NEXT_PUBLIC_APP_URL=https://insyde.talkxo.com
CRON_SECRET=                   # random string; set same value in Vercel
```

---

## New Files Created

```
public/sw.js                         Service worker for push notifications
components/page-shell.tsx            Reusable narrow/wide layout wrapper
components/presence-strip.tsx        One-liner: who's in/WFH today (Control tab)
components/today-presence-card.tsx   Grouped card: office vs remote (Snapshot tab)
components/week-strip.tsx            WFH week visual — full (Plan tab) + compact (banner)
components/wfh-planner-tab.tsx       Plan tab: day picker, save, team view
lib/use-reward.ts                    Confetti helpers for check-in/check-out
app/api/push/subscribe/route.ts      VAPID push subscription endpoint
app/api/push/send/route.ts           Server-side push sender
app/api/wfh-schedule/route.ts        WFH schedule GET + POST
app/api/cron/wfh-reminder/route.ts   Monday cron: push reminder to unscheduled employees
```

---

## Files Modified

```
app/globals.css                      P0-1: Fix --primary to brand purple
components/pin-login.tsx             P0-2: type="password"; P0-3: stale-state fix
app/page.tsx                         P1-1 timezone · P1-4 mode toggle · P2-1 bottom nav
                                     P2-2 tooltips · P2-3 snapshot rebuild · P2-4 weekend
                                     warning · P3-1 debug logs · TAB-1 hero cleanup ·
                                     TAB-2 PresenceStrip · TAB-3 streak · Feature 1 AI flag ·
                                     Feature 2 push register + trigger · Feature 3 banner +
                                     plan tab render + state · Feature 4 confetti + haptics
components/attendance-history.tsx    P1-2: date numbers + legend
app/leave/page.tsx                   P1-3: PageShell wide variant
components/leave-management.tsx      P1-3: remove amber/orange glows
components/assistant-chat.tsx        P1-1: IST timestamps
tailwind.config.js                   P3-2: add scale-102
lib/time.ts                          Feature 3: getMondayOfWeek()
vercel.json                          Feature 2: wfh-reminder cron entry
```

---

## Completion Checklist

### Phase 1 — Audit Fixes
- [ ] P0-1 · `--primary` fixed to brand purple in both light and dark mode
- [ ] P0-2 · PIN inputs use `type="password"`
- [ ] P0-3 · PIN auto-submit race condition fixed
- [ ] P1-1 · Check-in clock and chat timestamps show IST
- [ ] P1-2 · Calendar cells have date numbers; 5-item legend below
- [ ] P1-3 · Leave page uses `PageShell wide`; amber glows removed
- [ ] P1-4 · Mode toggle is a labelled pill (Office / Remote)
- [ ] P2-1 · Bottom nav: Control / Snapshot / Plan / Leave / Theme / Logout
- [ ] P2-2 · Tooltips on all three overview cards; Deep Score has progress bar
- [ ] P2-3 · Snapshot rebuilt: presence card, streak, bordered sessions, admin leave badge
- [ ] P2-4 · Weekend warning banner on Saturday/Sunday
- [ ] P3-1 · Debug `console.log` removed or gated
- [ ] P3-2 · `scale-102` added to Tailwind config
- [ ] P3-3 · `employee-pins-2025-12-05.csv` removed; `.gitignore` updated
- [ ] `npm run build` passes with zero TypeScript errors ✓

### Phase 2 — Tab Reorganisation
- [ ] TAB-1 · Control tab hero area cleaned up; `msg` simplified
- [ ] TAB-2 · `<PresenceStrip />` in Control tab after check-in button
- [ ] TAB-3 · Streak computed and shown in Snapshot tab
- [ ] TAB-4 · `<TodayPresenceCard />` at top of Snapshot tab

### Phase 3 — Features
- [ ] Feature 1 · `FEATURE_AI_ENABLED = false`; no AI calls or UI in user-facing app
- [ ] Feature 2 · Service worker live; VAPID keys set; subscribe + send endpoints working; push fires on check-in and check-out; Monday cron configured
- [ ] Feature 3 · `wfh_schedule` table created; Plan tab with interactive Mon–Fri pills; save works; persistent dashboard nudge until week is planned; compact strip after save; team view shows colleagues
- [ ] Feature 4 · Confetti on check-in and check-out; button pulse with green ring; haptic on mobile
- [ ] `npm run build` passes with zero TypeScript errors ✓
- [ ] Database migrations run in Supabase
- [ ] Environment variables set in Vercel
