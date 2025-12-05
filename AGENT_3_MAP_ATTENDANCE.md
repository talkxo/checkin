# Agent 3: Map Integration & Attendance History

## Objective
Implement map-based location check-in and attendance history features. These are independent features that don't interfere with Agent 2's work.

## Files to Create/Modify

### 1. Update `package.json`
**Purpose**: Add map library dependency

**Requirements**:
- Add: `"leaflet": "^1.9.4"` and `"react-leaflet": "^4.2.1"`
- Or use Google Maps if preferred
- Run `npm install` after adding

**Location**: Add to `dependencies` section in `package.json`

### 2. Create `components/location-checkin.tsx`
**Purpose**: Map-based check-in interface for Office/Remote selection

**Requirements**:
- Accept props:
  - `onCheckIn: (mode: 'office' | 'remote') => void` - Check-in handler
  - `currentLocation?: { lat: number, lng: number }` - User's current location
  - `isLoading?: boolean` - Loading state
- Display:
  - Header: "Current Location" (smaller text)
  - Location name: "Office" or "Remote" (larger, bold text)
    - Determined by geofence detection
    - Office coordinates: 28.44388735° N, 77.05672206834356° E
    - ~1km radius geofence
  - Map component:
    - Show user location with blue pin
    - Show office location with marker
    - Show geofence circle (light blue, ~1km radius)
    - Visual indication: Inside circle = "Office", Outside = "Remote"
    - Dark map theme to match screenshot aesthetic
  - Large "Check in" button at bottom:
    - Black/dark background, white text
    - Full width on mobile
    - Calls `onCheckIn` with detected mode ('office' or 'remote')
- Use existing location detection logic from `app/page.tsx` (lines ~228-269)
- Handle location permissions
- Handle loading and error states
- Mobile-first responsive design

**Map Library Setup**:
- Use Leaflet with dark theme
- Import: `import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'`
- Add Leaflet CSS: `import 'leaflet/dist/leaflet.css'`
- Configure dark tile layer (e.g., CartoDB Dark Matter or custom dark tiles)

**Geofence Logic**:
- Calculate distance from user location to office coordinates
- If distance <= 1km (0.01 degrees), show "Office"
- Else, show "Remote"
- Update location name dynamically when user location changes

### 3. Create `components/attendance-history.tsx`
**Purpose**: Attendance history view with date picker and day selector

**Requirements**:
- Accept props:
  - `userSlug?: string` - User identifier
  - `onDateSelect?: (date: Date) => void` - Date selection handler
- Display:
  - Header:
    - "View your attendance details" (smaller text)
    - "Attendance History" (larger text) - **Fix typo: "Attandance" → "Attendance"**
    - Optional: Link icon and vertical ellipsis on right
  - Date picker section:
    - "Select Date" label
    - Date display with calendar icon (e.g., "Wed, Jul 22 2024")
    - Clickable to open date picker
  - Horizontal scrollable day selector:
    - Days of week with dates (Mon 19, Tue 20, Wed 21, Thu 22, Fri 23, Sat 24, Sun 25)
    - Selected day highlighted (blue/purple accent)
    - Smooth horizontal scrolling
    - Touch-friendly on mobile
  - Attendance details for selected date:
    - Check-in time
    - Check-out time
    - Total hours worked
    - Status badges
    - Optional: Additional details

**Date Picker**:
- Use native HTML5 date input or a date picker library
- Format dates consistently (IST timezone)
- Default to current date

**Day Selector**:
- Generate days for current week (or selected week)
- Highlight selected day
- Smooth scroll to selected day on mount
- Handle edge cases (month boundaries, etc.)

**API Integration**:
- Create or use endpoint: `/api/attendance/history?slug={slug}&date={date}`
- Fetch attendance data for selected date
- Handle loading and error states

### 4. Create API Endpoint (if needed) - `app/api/attendance/history/route.ts`
**Purpose**: Fetch attendance history for a specific date

**Requirements**:
- Accept query params: `slug` (string), `date` (ISO date string)
- Query sessions table for user on that date
- Return: check-in time, check-out time, total hours, status
- Handle errors gracefully

**Note**: Only create if endpoint doesn't exist

### 5. Integrate Components in `app/page.tsx` (Optional)
**Purpose**: Add map and attendance history to main page (if needed)

**Requirements**:
- Add LocationCheckIn component (can be in a modal or separate view)
- Add AttendanceHistory component (can be in a tab or separate view)
- Integrate with existing check-in flow
- Use existing location detection state

**Location**: Add after existing sections or in a new tab/view

**Note**: Coordinate with Agent 2 if adding to main page structure

## Dependencies
- None - this agent works independently
- May need to coordinate with Agent 2 for integration points

## Deliverables Checklist
- [ ] Map library added to `package.json` and installed
- [ ] `components/location-checkin.tsx` created with map and geofence
- [ ] Location detection works (Office/Remote based on geofence)
- [ ] Map displays correctly with dark theme
- [ ] `components/attendance-history.tsx` created with date picker
- [ ] Day selector works with horizontal scrolling
- [ ] Attendance history fetches and displays data
- [ ] Typo fixed: "Attandance" → "Attendance"
- [ ] API endpoint created (if needed)
- [ ] Components integrated into app (if needed)
- [ ] Mobile-responsive design
- [ ] All features tested

## Testing
- Test map loads and displays user location
- Test geofence detection (Office vs Remote)
- Test check-in button triggers with correct mode
- Test date picker works
- Test day selector scrolls and highlights correctly
- Test attendance data fetches for selected date
- Test on mobile and desktop
- Test location permissions handling

## Notes
- Do NOT modify main page layout structure (Agent 2's responsibility)
- Map can be in a separate route or modal if preferred
- Attendance history can be in a separate route or tab
- Use existing location detection logic from `app/page.tsx`
- Office coordinates: 28.44388735° N, 77.05672206834356° E
- Geofence radius: ~1km (0.01 degrees)
- Keep components independent and reusable

## Map Resources
- Leaflet documentation: https://react-leaflet.js.org/
- Dark map tiles: CartoDB Dark Matter, or use custom tiles
- Leaflet CSS must be imported for map to render

## API Endpoints
- May need to create: `/api/attendance/history` for attendance data
- Use existing: `/api/summary/me` if it provides date-specific data

