# Checkout Reminder Notification - Implementation Spec

## Overview
Send a notification to users at a configurable time (default 6:00 PM IST) to remind them to checkout if they're still checked in.

## Requirements

### 1. User Setting Storage
- **Storage**: Use `localStorage` for user preference (or user settings table if available)
- **Key**: `checkoutReminderTime`
- **Default**: `"18:00"` (6:00 PM in 24-hour format)
- **Format**: "HH:mm" (24-hour) or "h:mm A" (12-hour with AM/PM)
- **Enable/Disable**: Store `checkoutReminderEnabled` (boolean, default: `true`)

### 2. Notification Logic
- **Trigger Time**: Check every minute if current IST time matches reminder time
- **Conditions**:
  - User must be checked in (`hasOpen === true`)
  - Reminder must be enabled (`checkoutReminderEnabled === true`)
  - Only send once per day (track `lastReminderDate` in localStorage)
  - Current IST time must match reminder time (within 1 minute window)
- **Notification Type**: Browser Notification API (with fallback to in-app notification)

### 3. Notification Content
- **Title**: "Time to Check Out!"
- **Body**: "You've been working since [check-in time]. Don't forget to check out!"
- **Icon**: Optional app icon or bell icon
- **Actions**: Optional action button to navigate to checkout

### 4. Settings UI
- **Location**: Add to user profile/settings section (can be in header dropdown or separate settings page)
- **Components**:
  - Time picker input (12-hour or 24-hour format)
  - Toggle switch to enable/disable reminders
  - Save button
- **Default Values**: Show current reminder time setting
- **Validation**: Ensure time is in valid format

### 5. Implementation Details

#### Hook/Component: `components/checkout-reminder.tsx` or hook in `app/page.tsx`

```typescript
// Pseudo-code structure
useEffect(() => {
  // Request notification permission
  // Set up interval to check every minute
  // Compare current IST time with reminder time
  // Check if user is checked in
  // Check if already reminded today
  // Send notification if conditions met
  // Track last reminder date
}, [hasOpen, reminderTime, reminderEnabled])
```

#### Time Comparison Logic
- Get current IST time
- Parse reminder time from localStorage
- Compare hours and minutes (ignore seconds)
- Trigger if match (within 1-minute window)

#### Notification Permission
- Request permission on first use: `Notification.requestPermission()`
- Handle states: 'granted', 'denied', 'default'
- Show in-app notification if browser notifications denied
- Gracefully handle if notifications not supported

#### Daily Tracking
- Store `lastReminderDate` in localStorage
- Format: ISO date string (e.g., "2024-07-22")
- Compare with current date (IST)
- Reset daily at midnight IST

### 6. Files to Create/Modify

#### Create `components/checkout-reminder.tsx` (Optional - can be hook in page.tsx)
- Custom hook or component for reminder logic
- Export hook: `useCheckoutReminder(hasOpen, checkinTime)`

#### Modify `app/page.tsx`
- Add reminder time state: `const [reminderTime, setReminderTime] = useState('18:00')`
- Add reminder enabled state: `const [reminderEnabled, setReminderEnabled] = useState(true)`
- Load from localStorage on mount
- Add useEffect for reminder logic
- Add settings UI (can be in header dropdown or separate section)

#### Create `components/reminder-settings.tsx` (Optional)
- Settings component for configuring reminder time
- Time picker input
- Enable/disable toggle
- Save to localStorage

### 7. Testing Checklist
- [ ] Notification triggers at configured time
- [ ] Only triggers if user is checked in
- [ ] Only triggers once per day
- [ ] Time picker saves correctly
- [ ] Enable/disable toggle works
- [ ] Browser notification permission handling works
- [ ] In-app notification fallback works
- [ ] Works correctly in IST timezone
- [ ] Handles edge cases (midnight, timezone changes, etc.)

### 8. Edge Cases
- User checks out before reminder time → No notification
- User checks in after reminder time → No notification that day
- Browser tab closed → Browser notification still works (if permission granted)
- Multiple tabs open → Only send one notification
- Timezone changes → Use IST consistently
- Notification permission denied → Show in-app notification

### 9. Integration Points
- Use existing `hasOpen` state from `app/page.tsx`
- Use existing `currentSession` for check-in time
- Use existing `formatISTTimeShort` for time formatting
- Can integrate with notification bell icon in header (Agent 2)

## Implementation Notes
- This feature is independent and can be implemented alongside other UI changes
- Can be added to Agent 2's checklist since it's related to main page functionality
- Notification should be non-intrusive and dismissible
- Consider adding "Snooze" option (optional enhancement)

