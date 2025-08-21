# TalkXO Check-in - Features Overview

## Major features and how they work

| Feature | What it does | How to use it | Examples | Notes/Tech |
|---|---|---|---|---|
| Check-in / Check-out | Starts and ends work sessions for a user | Type your name, select from suggestions, hold the button to confirm | Type "Khu" → select "Khushi" → hold button | Validates selection; no new user creation via UI |
| Name suggestions + validation | Prevents typos like "ri" being treated as a full name | Start typing your name and pick from the list | Type "Khu" → see "Khushi" in dropdown → click to select | Only allows known employees; safer data |
| Session persistence | Keeps you logged in after check-in | Refresh the page; your state is preserved | Khushi checks in → refreshes page → still sees "Hi, Khushi!" | Uses `localStorage` and open-session check |
| Hold-to-confirm button | Reduces accidental check-ins/outs | Press and hold until it completes | Hold "Check In" button for ~2.5 seconds | Debounced; progress indicator |
| Auto office/remote detection | Picks Office/Remote based on location | Allow location access on first run | Khushi at office → auto-detects "Office Location" | Office coords: 28.44388735, 77.05672206834356; 1km radius; falls back to Remote |
| Manual mode retention | Remembers last chosen mode | Switch mode if needed; it's saved | Khushi switches to "Remote" → next time defaults to "Remote" | Stored in `localStorage` |
| Today's Snapshot (All users) | Shows First In, Last Out, total hours, and status for today | Visible on user and admin views | Khushi: "09:30" → "18:45" → "8h 15m" → "Complete" | Correctly handles multiple sessions/day; responsive horizontal scroll |
| My Summary (User) | Shows your Last In/Out and hours for today | Visible after login | Khushi sees: "Last In: 09:30" → "Last Out: 18:45" → "8h 15m worked" | Reads "open session" state too |
| Admin Dashboard (Analytics) | High-level charts and numbers | Go to `/admin` (protected) | Visit `/admin` → login with `admin`/`talkxo2024` | Username/password: `admin`/`talkxo2024` |
| Admin – Today's Attendance | Table of today's data per user | In Admin page | Khushi row: "Khushi" → "09:30" → "18:45" → "8h 15m" → "Complete" | Includes mode, status, hours |
| Admin – User Management | Add, edit, deactivate employees | Admin → User Management tab | Add "John Doe" → Edit "Khushi" email → Deactivate "Old User" | Full CRUD operations; soft delete |
| **AI Insights (NEW)** | AI-powered attendance analysis | Admin → AI Insights tab | Click "Generate Insights" → AI analyzes patterns and trends | Powered by Kimi K2 via OpenRouter |
| **AI Reports (NEW)** | Professional attendance reports | Admin → AI Insights tab | Click "Generate Report" → AI creates executive summary | Professional formatting for management |
| **Smart Notifications (NEW)** | Personalized AI messages | Automatic on check-in/out | "Great start to your day! You're consistently early" | Context-aware, encouraging messages |
| Export CSV (Today) | Downloads today's attendance as CSV | Click "Export CSV" in Admin | Download: `attendance_2024-01-15.csv` | `app/api/admin/today-export` |
| Export to Google Sheets (Guidance) | Explains what's needed to push data to Sheets | Click "Export Google Sheets" in Admin | Shows: "Need Google Cloud project + Sheets API + service account" | Needs Google Cloud project, Sheets API, service account + share |
| Reset all sessions (Admin) | Checks out everyone safely | Click "Reset Sessions" in Admin | Double confirm → 5-second delay → all users checked out | Double confirmation and delay; uses IST timestamp |
| Daily reset (IST) | Ensures fresh day boundaries (00:00–23:59 IST) | Happens automatically | 11:59 PM IST → 12:00 AM IST = new day | Fixed with consistent IST handling |
| Timezone standardization | All times shown and stored correctly in IST | No user action | Khushi checks in at 3:27 AM IST → shows "03:27:00" (not 8:57 AM) | Consistent IST via `nowIST`, API formatting, and UI helpers |
| Notifications | Shows success/error messages with time | Triggered on check-in/out and errors | "✅ Checked in successfully at 09:30:00" | Clean single-time display; auto-hide |
| Basecamp OAuth + Vercel Cron | Can post weekday Campfire summaries | Visit `/api/basecamp/auth` to connect; cron posts at 11:30 IST (06:00 UTC) | Connect → cron posts: "Today's attendance: Khushi 8h 15m" | Uses stored tokens in Supabase settings |
| Per-user URL | Check-in via personal link | Visit `/u/[slug]` | Khushi's link: `/u/khushi` | Uses same hold-to-confirm |
| Supabase storage + RLS | Secure Postgres storage for employees/sessions | Transparent to users | Khushi's data: `employees` table + `sessions` table | Uses anon client for reads, service role for writes |
| Notion-like UI | Clean, light, mobile-first interface | Responsive on mobile/desktop | Mobile: stacked layout, Desktop: side-by-side | Tailwind + custom components |

## AI Features Powered by Kimi K2 (NEW)

### 🤖 AI-Powered Insights
- **Attendance Analysis**: AI analyzes patterns, trends, and provides actionable recommendations
- **Professional Reports**: Generates executive-level reports for management review
- **Smart Notifications**: Personalized, encouraging messages based on user behavior
- **Schedule Suggestions**: AI recommends optimal work schedules based on patterns
- **Team Collaboration Insights**: Analyzes team availability for better coordination
- **Productivity Analysis**: Provides personalized productivity tips and insights

### 🧠 AI Implementation
- **Model**: Moonshot AI's Kimi K2 (1T total parameters, 32B active parameters, Mixture-of-Experts architecture)
- **API**: OpenRouter API for seamless integration
- **Features**: Advanced tool use, reasoning, code synthesis, long-context inference
- **Context**: 128K token context window
- **Cost**: Free tier available via OpenRouter

### 📊 AI API Endpoints
- `POST /api/ai/insights` - Generate attendance insights and recommendations
- `POST /api/ai/schedule-suggestions` - Get personalized schedule recommendations
- `POST /api/ai/report` - Generate professional attendance reports
- `POST /api/ai/notification` - Create smart, personalized notifications

### 🎯 AI Use Cases
1. **Admin Dashboard**: AI tab with insights and report generation
2. **User Experience**: Smart notifications on check-in/out
3. **Management**: Professional reports for executive review
4. **Productivity**: Personalized recommendations for better work patterns
5. **Team Coordination**: AI-powered collaboration insights

## User Management Features

### Admin User Management
- **Add New Users**: Click "Add User" button in User Management tab
- **Edit Users**: Click edit icon next to any user to modify name, email, or status
- **Deactivate Users**: Click trash icon to soft-delete (sets active=false)
- **View All Users**: See complete list with status, creation date, and slug
- **User Status**: Active/Inactive badges to show current state

### User Management API Endpoints
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Add new user
- `PUT /api/admin/users` - Update existing user
- `DELETE /api/admin/users?id=<user_id>` - Deactivate user

### Examples for Placeholders
- **Per-user URL**: Visit `/u/khushi` for Khushi's personal check-in page
- **User Management**: Add "John Doe" with email "john@talkxo.com"
- **Slug Generation**: "Khushi Patel" becomes "khushi-patel" automatically
- **Status Management**: Deactivate "Old Employee" → they can't check in anymore

## Technical Implementation

### Database Schema
```sql
-- Employees table with auto-generated slugs
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  slug text UNIQUE GENERATED ALWAYS AS (regexp_replace(lower(full_name),'[^a-z0-9]+','-','g')) STORED,
  email text UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sessions table with mode tracking
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  checkin_ts timestamptz NOT NULL DEFAULT now(),
  checkout_ts timestamptz,
  mode text NOT NULL CHECK (mode IN ('office','remote')),
  ip inet,
  user_agent text
);
```

### AI Integration
```typescript
// AI utility functions
import { getAttendanceInsights, generateSmartNotification } from '@/lib/ai';

// Generate insights
const insights = await getAttendanceInsights(attendanceData);

// Smart notifications
const notification = await generateSmartNotification(userData, context);
```

### Key Features
- **Soft Delete**: Users are deactivated, not permanently deleted
- **Auto Slug Generation**: Names are converted to URL-friendly slugs
- **Email Optional**: Users can be created without email addresses
- **Active Status**: Only active users can check in/out
- **Audit Trail**: Creation dates and modification tracking
- **AI-Powered**: Kimi K2 integration for intelligent insights
- **Real-time Analysis**: AI processes attendance data for actionable insights
