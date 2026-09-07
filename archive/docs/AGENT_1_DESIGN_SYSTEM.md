# Agent 1: Design System & Reusable Components

## Objective
Create reusable components and design system updates that other agents will use. Focus on status badges, overview cards, and CSS utilities.

## Files to Create/Modify

### 1. Create `components/status-badge.tsx`
**Purpose**: Reusable status badge component for "On time", "Too Early", "n/a" indicators

**Requirements**:
- Accept props: `status: 'on-time' | 'too-early' | 'na' | 'ongoing'`
- Display text: "On time", "Too Early", "n/a", "Break Ongoing"
- Color scheme:
  - "On time": Orange background (`bg-orange-500` or `#f97316`)
  - "Too Early": Red background (`bg-red-500` or `#ef4444`)
  - "n/a": Gray background (`bg-gray-500` or `#6b7280`)
  - "ongoing": Red background (same as "Too Early")
- Pill-shaped design (rounded-full)
- Small text size (text-xs)
- White text on colored background
- Mobile-friendly sizing

**Reference**: Screenshot shows pill-shaped badges with colored backgrounds

### 2. Create `components/overview-card.tsx`
**Purpose**: Reusable card component for Check-in, Check-out, Break, and Overtime cards

**Requirements**:
- Accept props:
  - `type: 'checkin' | 'checkout' | 'break' | 'overtime'`
  - `time?: string` - Display time (e.g., "09:10 AM" or "--:--")
  - `status?: string` - Status badge text
  - `message: string` - Message below time (e.g., "Checked in success")
  - `icon?: React.ReactNode` - Icon component
  - `updateDate?: string` - For overtime card (e.g., "Update, Jul 18 2024")
- Layout structure:
  - Top row: Time on left, Status badge on right
  - Middle: Message text
  - Right side: Icon (checkmark, arrow-out, horizontal lines, etc.)
- Use existing purple/white color scheme
- Dark card background (if needed) or white with purple accents
- Mobile-first responsive design
- Proper spacing and padding

**Reference**: Screenshot shows cards with time/badge on top, message below, icon on side

### 3. Update `app/globals.css`
**Purpose**: Add status badge color utilities only (keep all existing colors)

**Requirements**:
- Add CSS classes for status badge colors:
  - `.status-badge-on-time` - Orange background
  - `.status-badge-too-early` - Red background  
  - `.status-badge-na` - Gray background
- Keep ALL existing purple color scheme intact
- Keep ALL existing gradient backgrounds
- Only add new status badge utilities
- Use Tailwind color classes or custom CSS variables

**Location**: Add to `@layer components` section in `app/globals.css`

### 4. Update `tailwind.config.js` (if needed)
**Purpose**: Add status badge colors to Tailwind config (optional, if using Tailwind classes)

**Requirements**:
- Only add if using custom Tailwind colors
- Add orange, red, gray variants for status badges
- Keep all existing brand purple colors unchanged

## Dependencies
- None - this agent creates foundational components

## Deliverables Checklist
- [ ] `components/status-badge.tsx` created with all status variants
- [ ] `components/overview-card.tsx` created with all card types
- [ ] Status badge colors added to `app/globals.css` (existing colors preserved)
- [ ] Components tested independently (can render with sample props)
- [ ] Components are mobile-responsive
- [ ] Components use existing purple color scheme

## Testing
- Test each component in isolation
- Verify status badges render with correct colors
- Verify overview cards render with different types
- Check mobile responsiveness
- Ensure no breaking changes to existing styles

## Notes
- Do NOT modify `app/page.tsx` (Agent 2's responsibility)
- Do NOT modify existing color palette
- Keep components generic and reusable
- Use TypeScript for type safety
- Export components for use by other agents

