# UI Revamp - Agent Checklists Summary

This document provides an overview of all agent checklists for the UI revamp project. Each agent can work independently with minimal interference.

## Agent 1: Design System & Reusable Components
**File**: `AGENT_1_DESIGN_SYSTEM.md`

**Focus**: Create foundational reusable components
- Status badge component (On time, Too Early, n/a)
- Overview card component (for check-in/check-out/break/overtime)
- CSS utilities for status badge colors
- No dependencies - creates components for others to use

**Key Deliverables**:
- `components/status-badge.tsx`
- `components/overview-card.tsx`
- Status badge CSS in `app/globals.css`

---

## Agent 2: Main Page Layout & Sections
**File**: `AGENT_2_MAIN_PAGE_LAYOUT.md`

**Focus**: Redesign main page with new layout, sections, and features
- Header redesign
- Overview section with 4 cards
- Recent Activity section
- Checkout reminder notification (6PM default, configurable)
- Auto-checkout after 12 hours (client-side)
- Page layout restructure

**Dependencies**: Requires Agent 1's components (StatusBadge, OverviewCard)

**Key Deliverables**:
- `components/recent-activity.tsx`
- Redesigned `app/page.tsx` with new sections
- Checkout reminder system
- Auto-checkout logic

**Additional Specs**:
- `CHECKOUT_REMINDER_SPEC.md` - Detailed checkout reminder implementation
- `AUTO_CHECKOUT_SPEC.md` - Detailed auto-checkout implementation

---

## Agent 3: Map Integration & Attendance History
**File**: `AGENT_3_MAP_ATTENDANCE.md`

**Focus**: Map-based location check-in and attendance history
- Map library integration (Leaflet/react-leaflet)
- Location check-in component (Office/Remote selection)
- Attendance history component with date picker
- No dependencies - independent feature work

**Key Deliverables**:
- `components/location-checkin.tsx`
- `components/attendance-history.tsx`
- Map library in `package.json`
- Optional: Attendance history API endpoint

---

## Agent 4: PIN-Based Login System
**File**: `AGENT_4_PIN_LOGIN.md`

**Focus**: Replace name-only login with secure PIN authentication
- Database migration (add pin_hash column)
- PIN verification API
- PIN login component
- Admin PIN management
- Setup script for initial PINs

**Dependencies**: None - completely independent feature

**Key Deliverables**:
- Database migration file
- `app/api/auth/verify-pin/route.ts`
- `app/api/admin/set-pin/route.ts`
- `components/pin-login.tsx`
- Admin PIN management interface
- `scripts/setup-pins.js`

**Migration Strategy**: Can be implemented alongside existing login, then replace

---

## Execution Order & Dependencies

### Phase 1: Foundation (Can run in parallel)
- ✅ **Agent 1**: Design System & Components (no dependencies)
- ✅ **Agent 3**: Map & Attendance (no dependencies)
- ✅ **Agent 4**: PIN Login (no dependencies)

### Phase 2: Main Page (After Agent 1)
- ✅ **Agent 2**: Main Page Layout (requires Agent 1's components)

### Phase 3: Integration & Testing
- All agents complete
- Integration testing
- Responsive design verification
- Local testing

---

## Key Features Summary

### UI Revamp Features
1. **Overview Cards**: Check-in, Check-out, Break, Overtime status cards
2. **Recent Activity**: User's check-in history
3. **Map-Based Check-in**: Visual location selection (Office/Remote)
4. **Attendance History**: Date-based attendance viewing
5. **Checkout Reminder**: Notification at configurable time (default 6PM)
6. **Auto-Checkout**: Automatic checkout after 12 hours
7. **PIN Login**: Secure 4-digit PIN authentication

### Design Principles
- Keep existing purple color palette (`#6a63b6`)
- Mobile-first responsive design
- Preserve all existing functionality
- No breaking changes to admin pages

---

## Files Overview

### New Components to Create
- `components/status-badge.tsx` (Agent 1)
- `components/overview-card.tsx` (Agent 1)
- `components/recent-activity.tsx` (Agent 2)
- `components/location-checkin.tsx` (Agent 3)
- `components/attendance-history.tsx` (Agent 3)
- `components/pin-login.tsx` (Agent 4)

### Main Files to Modify
- `app/page.tsx` - Main redesign (Agent 2)
- `app/globals.css` - Status badge colors (Agent 1)
- `package.json` - Map library (Agent 3)

### API Endpoints to Create
- `/api/auth/verify-pin` (Agent 4)
- `/api/admin/set-pin` (Agent 4)
- `/api/attendance/history` (Agent 3, optional)
- `/api/cron/auto-checkout` (Agent 2, optional server-side)

### Database Migrations
- `supabase/migrations/[timestamp]_add_pin_to_employees.sql` (Agent 4)

---

## Testing Checklist (All Agents)

### Agent 1
- [ ] Status badges render with correct colors
- [ ] Overview cards render with different types
- [ ] Components are mobile-responsive

### Agent 2
- [ ] Header displays correctly
- [ ] Overview cards show correct data
- [ ] Recent Activity fetches and displays
- [ ] Checkout reminder triggers at configured time
- [ ] Auto-checkout works after 12 hours
- [ ] All existing functionality preserved

### Agent 3
- [ ] Map loads and displays location
- [ ] Geofence detection works (Office/Remote)
- [ ] Attendance history displays correctly
- [ ] Date picker and day selector work

### Agent 4
- [ ] PIN login works with username
- [ ] PIN verification is secure
- [ ] Admin can set/reset PINs
- [ ] Rate limiting prevents brute force
- [ ] Migration script works

---

## Notes for Parallel Execution

1. **Agent 1** should complete first (or early) as Agent 2 depends on its components
2. **Agent 2, 3, 4** can work in parallel after Agent 1
3. **File Conflicts**: Minimal - each agent works on different files
4. **Integration Points**: 
   - Agent 2 imports from Agent 1
   - All agents use existing APIs and state management
5. **Testing**: Each agent should test independently before integration

---

## Additional Documentation

- `CHECKOUT_REMINDER_SPEC.md` - Detailed checkout reminder spec
- `AUTO_CHECKOUT_SPEC.md` - Detailed auto-checkout spec
- Main plan: `/Users/rishiraj/.cursor/plans/ui_revamp_mobile-first_design_50dd70a6.plan.md`

---

## Quick Start for Each Agent

1. Read your agent's checklist file
2. Review dependencies (if any)
3. Start with foundational components/APIs
4. Test independently
5. Coordinate integration points with other agents if needed

