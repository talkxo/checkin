# INSYDE — UX Audit & Improvement Recommendations

> Prepared after a full code review of `talkxo/checkin` and a live walkthrough of `insyde.talkxo.com`
> Stack: Next.js 14 · TypeScript · Tailwind CSS · Supabase · Radix UI · Framer Motion

---

## Executive Summary

INSYDE is a clean, well-intentioned attendance product with a Notion-inspired aesthetic and thoughtful features (hold-to-confirm, mood tracking, AI assistant). The core interaction model is solid. However, the live app reveals a set of compounding inconsistencies — the most critical being a **broken brand colour system** that renders the entire dark mode in a muddy orange palette instead of the intended purple, making the app feel unfinished. Combined with **layout fragmentation across pages**, a **PIN security gap**, and **several navigation dead-ends**, these issues significantly reduce confidence and usability.

All recommendations below preserve your fonts (Source Sans Pro, Cal Sans), spacing system, corner radius patterns, and component vocabulary. This is a re-standardisation, not a redesign.

---

## 1. Critical: Brand Colour System Is Broken

### What's happening
The style guide defines `#6a63b6` (purple) as the brand colour. `tailwind.config.js` registers it as `brand.DEFAULT`. But `globals.css` maps `--primary` to:
- **Light mode:** `222.2 47.4% 11.2%` → near-black navy
- **Dark mode:** `25 95% 53%` → **orange**

Since the live site runs in dark mode by default, every primary action — tab underlines, button fills, focus rings, the send button in the assistant — renders orange. Meanwhile the logo is teal, the check-in button is green, and info accents are amber. **The user sees four accent colours at once.**

### Fix
Unify `--primary` across both modes to the brand purple:

```css
:root {
  --primary: 246 30% 55%;          /* #6a63b6 in light mode */
  --primary-foreground: 0 0% 100%;
}
.dark {
  --primary: 246 30% 65%;          /* slightly lighter for dark backgrounds */
  --primary-foreground: 0 0% 100%;
}
```

Then audit every component that uses `bg-primary`, `text-primary`, `ring-primary`, `border-primary` — they will all snap to brand purple without further changes.

The **green check-in button** is intentional semantic colour (green = go, red = stop) and should stay. That's the one deliberate exception.

### Standardise Tailwind token usage
Replace any direct use of `bg-purple-600`, `text-purple-600` with `bg-brand` / `text-brand` or the CSS variable equivalents. The Tailwind `purple-600` swatch (#9333ea) differs from your brand purple (#6a63b6) by a large perceptual distance.

---

## 2. Critical: PIN Digits Shown in Plaintext

### What's happening
The four PIN boxes use `type="text"` with `inputMode="numeric"`. The entered digits are fully visible: `1 2 3 4` appear on screen as the user types.

### Fix
Use `type="password"` on each PIN input box. This immediately shows bullets/dots on all browsers and mobile keyboards, matching every ATM and mobile banking expectation users have. Keep `inputMode="numeric"` and `pattern="[0-9]*"` so the numeric keyboard still appears on mobile.

```tsx
<Input
  type="password"         // ← change from "text"
  inputMode="numeric"
  pattern="[0-9]*"
  ...
/>
```

---

## 3. High: PIN Auto-Submit Bug (Stale State Race Condition)

### What's happening
When a user clicks each PIN box individually and types, `handlePinSubmit` is called 100ms after the last digit. But it reads `pin.join('')` from React state, which hasn't committed the last digit yet (state update is async). Result: "Please enter a 4-digit PIN" error with all four boxes visually filled — a confusing, trust-damaging moment.

### Fix
Pass the fully assembled PIN to `handlePinSubmit` directly rather than reading from state:

```tsx
// In handlePinDigitChange
if (digit && index === 3) {
  const fullPin = newPin.join('');
  if (fullPin.length === 4) {
    setTimeout(() => handlePinSubmit(fullPin), 100); // pass fullPin directly
  }
}

// Updated signature
const handlePinSubmit = async (pinOverride?: string) => {
  const fullPin = pinOverride ?? pin.join('');
  if (!fullPin || fullPin.length !== 4) { ... }
  ...
};
```

---

## 4. High: Page Layout Fragmentation

Three pages, three completely different layout systems:

| Page | Max Width | Padding | Style Feeling |
|---|---|---|---|
| Main (`/`) | ~420px centred | p-4 | Mobile card, very narrow |
| Leave (`/leave`) | max-w-6xl (1152px) | Generous | Full desktop page |
| Admin (`/admin`) | Responsive, wide | Large | Dashboard |

The Leave page even has a **different ambient warmth** — amber/orange gradient card borders — that looks like an entirely separate product from the cold-dark main page.

### Fix
Define a single layout wrapper with two variants:

- **Narrow (app shell):** `max-w-md` centred — for the main check-in screen (keeps the focused, app-like feel)
- **Wide (content pages):** `max-w-4xl` centred — for Leave and Admin (consistent, not full-bleed)

The Leave page card borders should use `border-border/50` like the main `OverviewCard`, not bespoke amber glows.

---

## 5. High: Time Display Shows Wrong Timezone

### What's happening
- Check-in button: `Check In at 02:18` (UTC time on a server running in a UTC timezone)
- Assistant chat: timestamp `02:19 AM` (UTC)
- All IST formatting helpers exist in the code and work correctly for session logs, but the **live clock on the check-in button and chat timestamps** are not using them

The team is IST-based (India, UTC+5:30). When a user checks in, they expect to see `07:48`, not `02:18`.

### Fix
Apply `formatISTTimeShort()` to the live clock displayed in the check-in button and AI chat message timestamps. For the button specifically:

```tsx
// Instead of:
`Check In at ${currentTime.toLocaleTimeString(...)}`

// Use:
`Check In at ${formatISTTimeShort(currentTime.toISOString())}`
```

---

## 6. High: Calendar Has No Date Labels or Legend

### What's happening
The attendance calendar shows rows numbered 1–6 (week row index) and columns Mon–Sun, but individual **cells have no date numbers**. Users cannot tell which specific date a cell represents. The single orange cell (today) is identifiable, but historical squares all look identical.

Additionally there is **no legend**. All the dark-blue squares look the same whether the user was present, remote, absent, or on leave.

### Fix

**Add date numbers inside cells:**
```
Mon  Tue  Wed ...
 3    4    5  ...
[3]  [4]  [5] ...  ← tiny number in corner of each cell
```

**Add a minimal legend below the calendar:**
```
● Office  ● Remote  ● Absent  ● Leave  ○ Weekend
```

Use subtle colour variants already in the system:
- Office: `brand` purple fill
- Remote: `sky-500` (or muted blue)
- Absent/no data: `gray-700` (current dark squares)
- Leave: `amber-500`
- Today indicator: bright orange ring, not fill

---

## 7. Medium: "Deep Score" and "No-Fill Days" Are Unexplained

### What's happening
The three overview cards show:
- **Deep Score: 1.10 /42** — What is this? What is 42? What's a good score?
- **No-Fill Days: 13** — Days absent? Days not checked in? In what period?
- **Average Time: 10:45** — Average check-in time, check-out time, or hours worked?

A new employee would have no idea how to interpret these.

### Fix
Add a `?` tooltip icon or expandable info to each card:

```
Deep Score  [?]       → "Your punctuality score this quarter. Higher = more on-time check-ins."
No-Fill Days [?]      → "Working days this month where no check-in was recorded."
Average Time [?]      → "Your average check-in time this month."
```

Also surface the **scoring range** inline: `1.10 / 42 max` should be accompanied by a micro progress bar so users understand where they stand at a glance.

---

## 8. Medium: "Manage Leaves" Navigation Is Invisible

The only way to reach the Leave page from the main app is a small plaintext link at the very bottom of the screen — `Manage Leaves` — sitting in the footer next to the logout button. No icon, no visual weight.

### Fix — Bottom Navigation Bar
Replace the ad-hoc footer links with a proper **sticky bottom nav bar** (ideal for this narrow mobile-first layout):

```
[🏠 Control]  [📊 Snapshot]  [💬 Assistant]  [📅 Leave]
```

This also eliminates the need for the three tab labels at the top of the page (which are styled inconsistently with the rest of the design). The Leave section becomes a first-class destination.

---

## 9. Medium: House Icon Button Has No Label or Tooltip

Next to the check-in button is a small square with a house icon. It controls the office/remote mode toggle — a critical piece of context for every check-in. But there is no label, tooltip, or visible current state.

### Fix
Replace the opaque icon button with a visible **pill toggle**:

```
[🏢 Office]  [🏠 Remote]
```
Show which mode is currently active with a filled/selected state. This removes ambiguity about what mode the user is about to check in as.

---

## 10. Medium: Snapshot Tab Is Nearly Empty

The Snapshot tab shows "No recent activity" and a barely-readable dropdown accordion. This is the least useful screen in the app — it offers nothing to a returning user.

### Fix
Make Snapshot the **team pulse view**:
- Who is checked in right now (today's office headcount)
- Your personal attendance streak
- A summary of your last 5 sessions (time in, time out, hours, mode)
- Leave requests awaiting approval (if admin)

This makes the tab genuinely worth visiting rather than an empty placeholder.

---

## 11. Medium: Weekend Check-in Has No Warning

Today is Sunday, March 29, 2026 — a weekend. The app cheerfully shows `Check In at 02:18` with no indication that this is a non-working day. A user could accidentally check in on a Sunday with no warning.

### Fix
When `isWeekend(currentDate)` is true, show a gentle banner:

```
⚠️  Today is Sunday. Are you sure you want to check in on a non-working day?
```

Keep the button enabled (some people genuinely work weekends) but add friction. The `isWorkDay()` function already exists in `lib/time.ts`.

---

## 12. Medium: Assistant Chat Timestamp Uses UTC

The AI assistant shows message timestamps in UTC (`02:19 AM`) instead of IST. This is the same timezone bug as the check-in button. On an IST-based team, seeing `02:19 AM` on a message that arrived during morning hours is disorienting.

### Fix
Apply the `formatISTTime` helper to chat message timestamps:
```tsx
// In assistant-chat.tsx or wherever messages are rendered:
<span>{formatISTTimeShort(message.timestamp)}</span>
// → shows 07:49 AM instead of 02:19 AM
```

---

## 13. Low: Remove Production Debug Logs

The main `page.tsx` contains multiple `console.log` statements left in from development:
```js
console.log('=== SESSION RESTORE DEBUG ===');
console.log('Setting name from session:', savedName);
console.log('Restored savedName from localStorage:', savedName);
console.log('Restored savedSlug from localStorage:', savedSlug);
console.log('Generating AI notification for context:', ...);
console.log('AI notification received:', ...);
```

These expose internal state in the browser DevTools in production and should be removed or replaced with a debug flag (`process.env.NODE_ENV === 'development'`).

---

## 14. Low: `employee-pins-2025-12-05.csv` Committed to Public Repo

The repository is public and contains `employee-pins-2025-12-05.csv` at the root level. If this file contains employee PINs or other PII, it should be immediately removed from the repository history (using `git filter-repo` or BFG Repo Cleaner) and added to `.gitignore`.

---

## 15. Low: `scale-102` Is Not a Standard Tailwind Class

`hover:scale-102` appears in the check-in button animation. Tailwind's default scale steps are `100`, `105`, `110` — `scale-102` is undefined without a custom config entry and will silently fail.

### Fix
Either add to `tailwind.config.js`:
```js
extend: { scale: { '102': '1.02' } }
```
Or change hover scale to `hover:scale-105` which is built-in.

---

## 16. Low: Snapshot Dropdown Is Unreadable

The accordion/dropdown button in the Snapshot tab has text that is barely distinguishable from the dark background. This needs a `border border-border` treatment to give it visible affordance.

---

## Summary Prioritisation

| Priority | Issue | Effort |
|---|---|---|
| 🔴 P0 | Brand colour — fix `--primary` CSS variable | 30 min |
| 🔴 P0 | PIN digits visible in plaintext | 5 min |
| 🔴 P0 | PIN auto-submit stale state bug | 30 min |
| 🟠 P1 | Wrong timezone on check-in clock & chat | 1 hr |
| 🟠 P1 | Calendar: add date numbers + legend | 2 hr |
| 🟠 P1 | Page layout fragmentation (Leave page) | 3 hr |
| 🟠 P1 | House icon → labelled mode toggle | 1 hr |
| 🟡 P2 | Bottom navigation bar | 3 hr |
| 🟡 P2 | Metric tooltips (Deep Score, No-Fill Days) | 1 hr |
| 🟡 P2 | Snapshot tab content | 4 hr |
| 🟡 P2 | Weekend warning on check-in | 1 hr |
| 🟢 P3 | Remove debug console.logs | 30 min |
| 🟢 P3 | Fix `scale-102` → `scale-105` | 5 min |
| 🟢 P3 | CSV file in public repo | 30 min |

---

## Design Token Quick Reference (Corrected)

```css
/* Suggested unified tokens */
--brand:           246 30% 55%;   /* #6a63b6 purple — light */
--brand-dark:      246 30% 65%;   /* slightly lighter purple — dark */
--success:         142 71% 45%;   /* green — check-in button, approved badges */
--warning:         38 92% 50%;    /* amber — pending badges only */
--destructive:     0 84% 60%;     /* red — check-out button, error states */
--muted-bg:        220 15% 12%;   /* card backgrounds in dark mode */
```

**Font stack remains unchanged:**
- Body: `Source Sans Pro`, system-ui
- Display/Brand: `Cal Sans` (headings like "What's up, Rishi!")

**Border radius remains unchanged:**
- Cards: `rounded-xl` (small cards) / `rounded-2xl` (modals, main card)
- Buttons: `rounded-lg`
- Badges: `rounded-md`

---

*This report covers UX issues found in the live app at `insyde.talkxo.com` and the codebase at `github.com/talkxo/checkin` as of March 29, 2026. New feature suggestions to follow in a separate document.*
