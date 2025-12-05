# Agent 4: PIN-Based Login System

## Objective
Replace the current name-only selection login with a secure PIN-based authentication system. Users will enter their username, followed by a 4-digit PIN to login.

## Current System Analysis
- Current login: Name input with autocomplete suggestions
- Selection from employee list validates user
- Stores `userName` and `userSlug` in localStorage
- No password/PIN authentication currently

## Files to Create/Modify

### 1. Database Schema Update
**Purpose**: Add PIN field to employees table

**Requirements**:
- Add `pin_hash` column to `employees` table (stored as hashed value, not plain text)
- PIN should be 4 digits (0000-9999)
- Use bcrypt or similar hashing algorithm
- Migration script to add column and optionally set default PINs

**Migration File**: Create `supabase/migrations/[timestamp]_add_pin_to_employees.sql`

```sql
-- Add pin_hash column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- Optional: Create index for faster lookups (if needed)
-- Note: We can't index hashed values effectively, so this may not be needed
```

**Note**: PINs should be hashed using bcrypt (already in dependencies: `bcryptjs`)

### 2. Create PIN Management API Endpoint
**Purpose**: Handle PIN verification and management

**File**: `app/api/auth/verify-pin/route.ts`

**Requirements**:
- Accept POST request with: `{ username: string, pin: string }`
- Username can be: full_name, slug, or email
- Lookup employee by username
- Verify PIN hash against stored `pin_hash`
- Return employee data if valid, error if invalid
- Handle rate limiting (prevent brute force attacks)
- Return: `{ success: boolean, employee?: { id, full_name, slug, email }, error?: string }`

**Security Considerations**:
- Hash PINs using bcrypt (cost factor 10-12)
- Don't reveal if username exists or not (same error message)
- Add rate limiting (max 5 attempts per 15 minutes per IP)
- Log failed attempts (optional, for security monitoring)

### 3. Create PIN Setup/Reset API Endpoint (Admin)
**Purpose**: Allow admins to set/reset employee PINs

**File**: `app/api/admin/set-pin/route.ts`

**Requirements**:
- Admin authentication required (use existing admin auth)
- Accept POST: `{ employeeId: string, pin: string }`
- Hash PIN before storing
- Update `pin_hash` in employees table
- Return success/error
- Validation: PIN must be exactly 4 digits

**Optional**: Self-service PIN change (if user is logged in, allow changing own PIN)

### 4. Create Login Component
**Purpose**: Replace name input with username + PIN login form

**File**: `components/pin-login.tsx`

**Requirements**:
- Two-step form:
  1. **Username Input**: 
     - Text input for username (full name, slug, or email)
     - Optional: Show autocomplete suggestions (but require PIN)
     - Validate username exists (optional, can skip for security)
  2. **PIN Input**:
     - 4-digit numeric input
     - Masked input (show dots/asterisks)
     - Auto-focus after username submission
     - Numeric keypad on mobile
- Submit button: "Login" or "Verify"
- Loading state during verification
- Error messages:
  - "Invalid username or PIN"
  - "Please enter a 4-digit PIN"
  - Rate limit message if too many attempts
- Success: Call `onLoginSuccess(employee)` callback
- Mobile-first design
- Use existing purple color scheme

**UI Flow**:
1. User enters username → clicks "Next" or presses Enter
2. PIN input appears (username shown above, can edit)
3. User enters 4-digit PIN
4. On submit, verify with API
5. On success, trigger login callback

### 5. Update `app/page.tsx` - Replace Login
**Purpose**: Replace current name selection with PIN login

**Requirements**:
- Remove current name input section (lines ~678-725)
- Replace with `<PinLogin onLoginSuccess={handlePinLoginSuccess} />`
- Update `handlePinLoginSuccess` function:
  - Accept employee object from PIN login
  - Set `selectedEmployee` state
  - Set `name` state
  - Store in localStorage (same as current system)
  - Set `isLoggedIn` to true
  - Set `showNameInput` to false
  - Fetch user summary data
- Keep all existing functionality after login
- Maintain session persistence (if user already logged in, skip PIN login)

**Location**: Replace `showNameInput` section in `app/page.tsx`

### 6. Admin Interface for PIN Management
**Purpose**: Allow admins to set/reset employee PINs

**File**: `app/admin/pin-management/page.tsx` (or add to existing admin page)

**Requirements**:
- List all employees
- Show PIN status (Set/Not Set)
- Form to set/reset PIN for each employee
- PIN input (4 digits, masked)
- "Set PIN" button
- "Reset PIN" button (clears PIN hash)
- Validation: PIN must be 4 digits
- Success/error messages

**Optional Features**:
- Bulk PIN generation (random 4-digit PINs)
- Export PIN list (for secure distribution)
- PIN reset via email (future enhancement)

### 7. Initial PIN Setup Script
**Purpose**: Script to set initial PINs for existing employees

**File**: `scripts/setup-pins.js`

**Requirements**:
- Read employees from database
- Generate random 4-digit PINs (or allow manual input)
- Hash PINs using bcrypt
- Update employees table
- Output PIN list (for secure distribution to employees)
- Option to set same PIN for all (e.g., "0000" for testing)

**Usage**: `node scripts/setup-pins.js`

## Dependencies
- `bcryptjs` - Already in package.json
- Existing employee lookup logic
- Existing admin authentication

## Security Best Practices

### PIN Storage
- Never store plain text PINs
- Use bcrypt with appropriate cost factor (10-12)
- Salt is automatically handled by bcrypt

### Rate Limiting
- Limit PIN verification attempts (5 per 15 minutes per IP)
- Track failed attempts in memory or database
- Show generic error message (don't reveal if username exists)

### PIN Requirements
- Exactly 4 digits (0000-9999)
- Allow all combinations (no restrictions on patterns)
- Optional: Prevent common PINs (1234, 0000, etc.) - can be added later

### Session Management
- After successful PIN login, maintain existing session logic
- PIN is only used for login, not for subsequent operations
- Session persists in localStorage (same as current system)

## Deliverables Checklist
- [ ] Database migration: Add `pin_hash` column to employees table
- [ ] API endpoint: `/api/auth/verify-pin` for PIN verification
- [ ] API endpoint: `/api/admin/set-pin` for admin PIN management
- [ ] Component: `components/pin-login.tsx` created
- [ ] Update `app/page.tsx`: Replace name input with PIN login
- [ ] Admin interface: PIN management page/component
- [ ] Setup script: `scripts/setup-pins.js` for initial PIN setup
- [ ] Rate limiting implemented
- [ ] Error handling and user feedback
- [ ] Mobile-responsive design
- [ ] Security testing (brute force prevention)

## Testing Checklist
- [ ] PIN login works with username (full name)
- [ ] PIN login works with slug
- [ ] PIN login works with email
- [ ] Invalid PIN shows error
- [ ] Invalid username shows error (generic message)
- [ ] Rate limiting prevents brute force
- [ ] PIN input is masked
- [ ] Mobile numeric keypad appears
- [ ] Admin can set/reset PINs
- [ ] Setup script generates and stores PINs correctly
- [ ] Existing session persistence still works
- [ ] Logout clears session properly

## Migration Strategy
1. **Phase 1**: Add PIN column (nullable) - existing users can still login with name
2. **Phase 2**: Deploy PIN login UI (optional, can use name or PIN)
3. **Phase 3**: Set PINs for all employees
4. **Phase 4**: Make PIN login required (remove name-only login)
5. **Phase 5**: Remove name-only login code

**For this implementation**: Can implement PIN login alongside name login initially, then remove name login after PINs are set.

## Notes
- PIN is 4 digits for simplicity and speed
- Can be enhanced later with:
  - PIN change by user (self-service)
  - PIN reset via email/SMS
  - Biometric authentication (fingerprint/face)
  - 2FA (two-factor authentication)
- Keep existing employee lookup logic (by name, slug, email)
- Maintain backward compatibility during migration period
- Use existing purple color scheme for UI

## API Endpoints

### POST `/api/auth/verify-pin`
```typescript
Request: { username: string, pin: string }
Response: { 
  success: boolean, 
  employee?: { id, full_name, slug, email },
  error?: string 
}
```

### POST `/api/admin/set-pin` (Admin only)
```typescript
Request: { employeeId: string, pin: string }
Response: { success: boolean, error?: string }
```

## Files to Create
- `supabase/migrations/[timestamp]_add_pin_to_employees.sql`
- `app/api/auth/verify-pin/route.ts`
- `app/api/admin/set-pin/route.ts`
- `components/pin-login.tsx`
- `app/admin/pin-management/page.tsx` (or component)
- `scripts/setup-pins.js`

## Files to Modify
- `app/page.tsx` - Replace name input with PIN login
- `package.json` - Verify bcryptjs is installed (already present)

