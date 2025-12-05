# Agent 2: Main Page Layout & Sections

## Objective
Redesign the main page (`app/page.tsx`) with new header, overview section, and recent activity. Integrate components from Agent 1.

## Files to Create/Modify

### 1. Create `components/recent-activity.tsx`
**Purpose**: Recent activity list component showing user's check-in history

**Requirements**:
- Accept props:
  - `activities: Array<{ date: string, status: string, time?: string }>`
  - `onSeeAll?: () => void` - Handler for "See All" link
- Display format:
  - Section header: "Recent Activity" on left, "See All" link on right (orange/purple accent)
  - Activity cards showing:
    - Date (e.g., "Mon, Jul 20 2024")
    - Status badge (using StatusBadge component from Agent 1)
    - Optional time display
- Layout: Horizontal scrollable or vertical list
- Use existing purple color scheme
- Mobile-first design

**API Integration**:
- Use `/api/admin/recent-activity` or create user-specific endpoint
- Handle loading and error states

### 2. Redesign `app/page.tsx` - Header Section
**Purpose**: Replace current header with screenshot-inspired design

**Requirements**:
- Status bar area (top):
  - Time display (current time, e.g., "9:41")
  - Optional: Signal, Wi-Fi, battery icons (can be simulated)
- Navigation bar:
  - Grid icon (left)
  - Notification bell icon (center-right)
  - Profile picture (right) - use user's name initials or placeholder
- Greeting section:
  - Small text: "Time to do what you do best"
  - Large bold text: "What's up, [Name]!" (use first name from `name` state)
- Sticky/fixed header for mobile
- Use existing purple color scheme
- Mobile-optimized spacing

**Location**: Replace lines ~730-743 in `app/page.tsx` (current header section)

### 3. Redesign `app/page.tsx` - Overview Section
**Purpose**: Add Overview section with four cards using OverviewCard component

**Requirements**:
- Section header:
  - "Overview" text on left
  - Date with calendar icon on right (e.g., "Wed, Jul 22 2024")
  - Format: Current date in IST timezone
- Four OverviewCard components:
  1. **Check-in Card**:
     - Time: Format from `currentSession?.session?.checkin_ts` or `me?.lastIn`
     - Status: "On time" (orange badge) - determine based on check-in time vs expected
     - Message: "Checked in success" if checked in, else empty
     - Icon: Checkmark icon
  2. **Check-out Card**:
     - Time: "--:--" if not checked out, else format from checkout time
     - Status: "n/a" (gray badge) if not checked out
     - Message: "It's not time yet" if not checked out
     - Icon: Arrow-out icon
  3. **Break Card**:
     - Time: Break time if break is active (may need to implement break tracking)
     - Status: "Too Early" (red badge) or appropriate status
     - Message: "Break Ongoing" if break active
     - Icon: Horizontal line icon
     - Note: May need to implement break tracking logic
  4. **Overtime Card**:
     - Time: "Total 8 Hour" or calculated hours
     - Update date: Last update date (e.g., "Update, Jul 18 2024")
     - Icon: Three horizontal lines icon
     - Note: Calculate from `me?.workedMinutes` or session data

**Location**: Add after header, before current tab content in `app/page.tsx`

**Data Sources**:
- Use existing `me`, `meYesterday`, `currentSession`, `hasOpen` states
- Use existing `formatISTTimeShort` function for time formatting
- May need to calculate "On time" status based on check-in time

### 4. Integrate Recent Activity in `app/page.tsx`
**Purpose**: Add Recent Activity section to main page

**Requirements**:
- Place after Overview section
- Use RecentActivity component from step 1
- Fetch activity data on component mount
- Handle loading states
- Use existing API or create user-specific endpoint

**Location**: Add after Overview section in `app/page.tsx`

### 5. Update `app/page.tsx` - Layout Structure
**Purpose**: Restructure page layout for mobile-first design

**Requirements**:
- Remove or update current tab structure (keep functionality, update UI)
- Ensure new sections flow properly:
  1. Header (sticky)
  2. Overview section
  3. Recent Activity section
  4. Existing tabs/content (may need to be redesigned or kept as-is)
- Mobile-first: Single column, proper spacing
- Desktop: Responsive grid if needed
- Keep existing check-in/check-out functionality intact
- Preserve all existing state management and API calls

## Dependencies
- Agent 1: Requires `StatusBadge` and `OverviewCard` components
- Wait for Agent 1 to complete before final integration (can start structure work)

## Deliverables Checklist
- [ ] `components/recent-activity.tsx` created and tested
- [ ] Header section redesigned in `app/page.tsx`
- [ ] Overview section added with four cards in `app/page.tsx`
- [ ] Recent Activity section integrated in `app/page.tsx`
- [ ] Checkout reminder notification system implemented
- [ ] User settings UI for reminder time configuration
- [ ] Auto-checkout after 12 hours implemented (client-side check)
- [ ] Page layout restructured for mobile-first design
- [ ] All existing functionality preserved (check-in, check-out, tabs)
- [ ] Data properly fetched and displayed
- [ ] Mobile-responsive layout
- [ ] Uses existing purple color scheme

## Testing
- Test header displays correctly with user name
- Test Overview cards show correct data
- Test Recent Activity fetches and displays data
- Test check-in/check-out still works
- Test on mobile and desktop
- Verify no breaking changes to existing features

## Notes
- Do NOT modify map or attendance history (Agent 3's responsibility)
- Import components from Agent 1: `import StatusBadge from '@/components/status-badge'` and `import OverviewCard from '@/components/overview-card'`
- Keep all existing state management (`useState`, `useEffect`, etc.)
- Preserve existing API calls and data fetching logic
- Break tracking may need to be implemented if not exists

### 6. Implement Checkout Reminder Notification
**Purpose**: Send notification to user at configured time (default 6PM) to remind them to checkout

**Requirements**:
- User setting to configure reminder time:
  - Default: 6:00 PM IST (18:00)
  - Stored in localStorage: `checkoutReminderTime` (format: "18:00" or "6:00 PM")
  - Or use user settings table if user-specific settings exist
- Notification logic:
  - Check every minute if current time matches reminder time
  - Only send if user has open session (`hasOpen === true`)
  - Only send once per day (track in localStorage: `lastReminderDate`)
  - Use browser Notification API or in-app notification
- Notification content:
  - Title: "Time to Check Out!"
  - Body: "You've been working since [check-in time]. Don't forget to check out!"
  - Optional: Action button to go to checkout
- Settings UI:
  - Add reminder time picker in user settings/profile section
  - Time input (24-hour or 12-hour format)
  - Toggle to enable/disable reminders
  - Save preference to localStorage or settings
- Handle notification permissions:
  - Request permission on first use
  - Show fallback in-app notification if browser notifications denied
  - Gracefully handle if notifications not supported

**Implementation**:
- Add `useEffect` hook in `app/page.tsx` to check reminder time
- Use `setInterval` to check every minute
- Compare current IST time with reminder time
- Check if user is checked in before sending
- Use `new Notification()` API or create in-app notification component

**Location**: Add to `app/page.tsx` or create `components/checkout-reminder.tsx` hook

### 7. Implement Auto-Checkout After 12 Hours
**Purpose**: Automatically check out users who have been checked in for 12+ hours

**Requirements**:
- Client-side check in `app/page.tsx`:
  - Add `useEffect` to check session duration periodically (every 15-30 minutes)
  - Calculate: `currentTime - checkin_ts` in hours
  - If >= 12 hours (configurable):
    - Show warning notification: "You'll be automatically checked out in 10 minutes"
    - After 10 minutes (or immediately), call checkout API
    - Update UI state (set `hasOpen` to false, clear session)
- Configuration:
  - Default: 12 hours
  - Store in localStorage or settings: `autoCheckoutHours` (default: 12)
  - Can be configured by admin (optional)
- Notification:
  - Warning 10 minutes before: "Auto-checkout in 10 minutes"
  - Final notification: "You've been automatically checked out after 12 hours"
- Use existing checkout API: `/api/checkout`
- Handle edge cases: timezone, concurrent checkouts, etc.

**Implementation**:
- Add state: `const [autoCheckoutWarning, setAutoCheckoutWarning] = useState(false)`
- Add `useEffect` hook to check session duration
- Use `currentSession?.session?.checkin_ts` for check-in time
- Calculate duration in hours
- Show warning and auto-checkout if needed

**Location**: Add to `app/page.tsx` after existing `useEffect` hooks

**Note**: Server-side cron job can be implemented separately (see `AUTO_CHECKOUT_SPEC.md`)

## API Endpoints to Use
- `/api/summary/me` - For user summary (already used)
- `/api/session/open` - For session status (already used)
- `/api/admin/recent-activity` - For recent activity (may need user-specific version)

