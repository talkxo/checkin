# Auto-Checkout After 12 Hours - Implementation Spec

## Overview
Automatically check out users who have been checked in for more than 12 hours (configurable duration). This prevents sessions from staying open indefinitely.

## Requirements

### 1. Configuration
- **Default Duration**: 12 hours
- **Configurable**: Allow admin to set auto-checkout duration (in hours)
- **Storage**: Store in settings table or environment variable
- **Key**: `autoCheckoutHours` (default: 12)

### 2. Auto-Checkout Logic

#### Server-Side (Recommended - More Reliable)
- **Cron Job or Scheduled Task**: Run periodically (every 15-30 minutes)
- **Check**: Find all open sessions where `checkout_ts IS NULL`
- **Calculate**: Time difference between `checkin_ts` and current time
- **Action**: If duration >= configured hours, automatically checkout
- **Logging**: Log auto-checkout events for audit trail

#### Client-Side (Alternative - Less Reliable)
- **Check on Page Load**: When user loads page, check session duration
- **Periodic Check**: Use `setInterval` to check every 15-30 minutes
- **Action**: If duration >= configured hours, show warning then auto-checkout
- **Limitation**: Only works when user has page open

### 3. Implementation Options

#### Option A: Server-Side Cron Job (Recommended)
- Create API endpoint: `/api/cron/auto-checkout`
- Call from Vercel Cron, external cron service, or server-side scheduler
- Runs independently of user activity
- More reliable and secure

#### Option B: Client-Side Check
- Add `useEffect` hook in `app/page.tsx`
- Check session duration on mount and periodically
- Show warning before auto-checkout (e.g., "You'll be checked out in 5 minutes")
- Auto-checkout after duration exceeded

#### Option C: Hybrid Approach
- Client-side check for active users (show warning)
- Server-side cron for inactive users (silent auto-checkout)

### 4. Auto-Checkout Behavior

#### When to Auto-Checkout
- Session duration >= configured hours (default 12 hours)
- User has open session (`checkout_ts IS NULL`)
- Current time - `checkin_ts` >= auto-checkout duration

#### What Happens on Auto-Checkout
1. Set `checkout_ts` to current IST time
2. Set `mood` to 'auto' or null (optional)
3. Set `mood_comment` to "Auto-checked out after [X] hours" (optional)
4. Log event (optional, for audit)
5. If client-side: Show notification to user
6. If client-side: Update UI state

#### User Notification (Client-Side)
- Show warning 5-10 minutes before auto-checkout
- Message: "You'll be automatically checked out in [X] minutes"
- Option to extend session (optional feature)
- Final notification: "You've been automatically checked out after 12 hours"

### 5. Files to Create/Modify

#### Create `app/api/cron/auto-checkout/route.ts`
**Purpose**: Server-side auto-checkout endpoint

**Requirements**:
- GET or POST endpoint (can be called by cron)
- Query open sessions from database
- Calculate duration for each session
- Auto-checkout sessions exceeding duration
- Return summary: `{ checkedOut: number, errors: number }`
- Optional: Add authentication/secret key for cron security

**Implementation**:
```typescript
// Pseudo-code
1. Get all open sessions (checkout_ts IS NULL)
2. For each session:
   - Calculate duration: now - checkin_ts
   - If duration >= autoCheckoutHours:
     - Set checkout_ts = now()
     - Set mood_comment = "Auto-checked out after X hours"
     - Update session
3. Return summary
```

#### Modify `app/page.tsx` (Client-Side Check)
**Purpose**: Check session duration and auto-checkout if needed

**Requirements**:
- Add `useEffect` hook to check session duration
- Check on component mount
- Check periodically (every 15-30 minutes)
- Calculate: `currentTime - checkin_ts`
- If >= 12 hours (or configured duration):
  - Show warning notification
  - Auto-checkout after short delay (5 minutes) or immediately
  - Call checkout API
  - Update UI state

**Location**: Add after existing `useEffect` hooks in `app/page.tsx`

#### Create `lib/auto-checkout.ts` (Optional)
**Purpose**: Utility functions for auto-checkout logic

**Requirements**:
- Function: `calculateSessionDuration(checkinTs: string): number` (returns hours)
- Function: `shouldAutoCheckout(checkinTs: string, maxHours: number): boolean`
- Function: `formatAutoCheckoutMessage(hours: number): string`

### 6. Configuration

#### Environment Variable (Optional)
- `AUTO_CHECKOUT_HOURS=12` (default: 12)

#### Settings Table (Recommended)
- Store in `settings` table: `{ key: 'auto_checkout_hours', value: 12 }`
- Allow admin to configure via admin panel
- Use existing `lib/settings.ts` functions

#### Admin UI (Optional)
- Add setting in admin panel to configure auto-checkout duration
- Input: Number of hours (default: 12)
- Save to settings table
- Apply immediately or on next cron run

### 7. Cron Job Setup

#### Vercel Cron (If using Vercel)
**File**: `vercel.json`

```json
{
  "crons": [{
    "path": "/api/cron/auto-checkout",
    "schedule": "*/30 * * * *"
  }]
}
```

#### External Cron Service
- Use services like cron-job.org, EasyCron, etc.
- Call `/api/cron/auto-checkout` endpoint
- Schedule: Every 15-30 minutes

#### Server-Side Scheduler (If self-hosted)
- Use node-cron or similar
- Schedule in server startup code

### 8. Testing Checklist
- [ ] Auto-checkout triggers after 12 hours (or configured duration)
- [ ] Only checks out open sessions
- [ ] Sets checkout_ts correctly
- [ ] Client-side warning shows before auto-checkout
- [ ] Server-side cron runs independently
- [ ] Handles edge cases (midnight, timezone changes)
- [ ] Logs auto-checkout events (optional)
- [ ] Admin can configure duration
- [ ] Works with existing checkout flow
- [ ] UI updates correctly after auto-checkout

### 9. Edge Cases
- **Multiple Sessions**: Shouldn't happen (unique constraint), but handle gracefully
- **Timezone**: Use IST consistently
- **Clock Changes**: Handle daylight saving time (IST doesn't have DST)
- **Concurrent Checkouts**: Handle race conditions if multiple cron jobs run
- **User Active During Auto-Checkout**: Show notification, allow manual checkout

### 10. Integration Points
- Use existing `/api/checkout` endpoint or create separate auto-checkout logic
- Use existing `nowIST()` function for timestamps
- Use existing session query logic
- Integrate with checkout reminder (Agent 2) - can work together

## Implementation Recommendation

**Recommended Approach**: Hybrid (Server + Client)

1. **Server-Side Cron**: 
   - Runs every 30 minutes
   - Checks all open sessions
   - Auto-checks out sessions >= 12 hours
   - Silent, no user notification needed

2. **Client-Side Check**:
   - Checks when user has page open
   - Shows warning 10 minutes before auto-checkout
   - Allows user to manually checkout before auto-checkout
   - Better user experience for active users

## Files to Create/Modify

### Create
- `app/api/cron/auto-checkout/route.ts` - Server-side auto-checkout endpoint
- `lib/auto-checkout.ts` - Utility functions (optional)

### Modify
- `app/page.tsx` - Add client-side check and warning
- `vercel.json` - Add cron job configuration (if using Vercel)
- `app/admin/page.tsx` - Add auto-checkout duration setting (optional)

## Notes
- This feature prevents sessions from staying open indefinitely
- 12 hours is a reasonable default (covers full work day + overtime)
- Can be adjusted based on company policy
- Works alongside checkout reminder (reminds at 6PM, auto-checks out at 12 hours)
- Consider adding "Extend Session" option (optional enhancement)

