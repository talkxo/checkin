# INSYDE Attendance Management App - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Core Functions](#core-functions)
3. [AI Integration](#ai-integration)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Authentication & Security](#authentication--security)
7. [Styling & UI Components](#styling--ui-components)
8. [Settings & Configuration](#settings--configuration)
9. [External Integrations](#external-integrations)
10. [File Structure](#file-structure)

## Overview

INSYDE is a modern attendance management system built with Next.js 14, Supabase, and AI integration. The app provides employee check-in/out functionality, admin analytics, and AI-powered insights for better workplace management.

**Key Technologies:**
- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **AI**: OpenRouter API with Kimi K2 model
- **Styling**: Tailwind CSS, Radix UI components
- **Authentication**: Custom admin session management
- **External**: Basecamp integration, Google Sheets export

## Core Functions

### 1. Employee Check-in/Check-out System

**Location**: `app/page.tsx` (Main user interface)

**Key Functions:**
- `act(mode)` - Handles check-in with office/remote mode detection
- `checkout()` - Processes check-out with mood tracking
- `handleEmployeeSelect(employee)` - Employee selection with validation
- `checkSessionStatus(slug)` - Verifies active sessions
- `getCurrentLocation()` - GPS-based office/remote detection
- `handleHoldStart()` / `handleHoldEnd()` - Hold-to-confirm button management
- `generateSmartNotification(context)` - AI-powered notifications
- `handleMoodSubmit()` - Mood tracking submission

**Features:**
- **Enhanced Hold-to-Confirm Button**: 
  - 2.5 second hold duration with visual progress indicator
  - Real-time progress bar with gradient animation
  - AI notification generation during hold process
  - Touch and mouse event support
- **GPS Location Detection**: Office coordinates (28.44388735°N, 77.05672206834356°E, 1km radius)
- **Session Persistence**: localStorage-based session management
- **Advanced Mood Tracking**: 
  - 5 mood options: 😊 great, 🙂 good, 😞 challenging, 😴 exhausted, 🚀 productive
  - Optional mood comments with textarea
  - Modal-based mood selection interface
- **Real-time Session Timer**: Live elapsed time tracking
- **AI-Powered Smart Notifications**: 
  - Context-aware messages during check-in/out
  - Automatic generation during hold process
  - Dismissible notification display
  - Fallback notifications on AI failure
- **Enhanced Session Display**: 
  - Dynamic status badges showing current session state
  - Real-time working duration display
  - Improved time formatting with IST timezone

### 2. Admin Dashboard

**Location**: `app/admin/page.tsx`

**Key Functions:**
- `loadStats()` - Fetches attendance statistics
- `loadUserStats()` - Individual user analytics
- `loadChartData()` - Chart visualization data
- `handleResetSessions()` - Bulk session management
- `generateAiInsights()` - AI-powered analysis
- `handleExportCSV()` - Data export functionality

**Features:**
- Real-time attendance monitoring
- User management (CRUD operations)
- AI insights and reports
- Data visualization with Chart.js
- Export capabilities (CSV, Google Sheets)
- Session reset functionality

### 3. Time Management

**Location**: `lib/time.ts`

**Key Functions:**
- `nowIST()` - Returns current IST time
- `isWorkdayIST()` - Checks if current day is workday (Mon-Fri)
- `hhmmIST(d)` - Formats timestamps in IST

**Settings:**
- Timezone: Asia/Kolkata (IST)
- Workdays: Monday to Friday
- Time format: 24-hour (HH:MM)

## AI Integration

### AI Service Layer

**Location**: `lib/ai.ts`

**Core Functions:**

#### 1. `callOpenRouter(messages, temperature)`
- **Purpose**: Main AI API interface with fallback models
- **Models**: Google Gemma 3N → OpenAI GPT-OSS → Moonshot Kimi K2 → Anthropic Claude Haiku
- **Features**: Automatic retry logic, rate limit handling, model fallback
- **Configuration**: Max 800 tokens, temperature 0.7 default

#### 2. `getAttendanceInsights(attendanceData, timeRange)`
- **Purpose**: HR-focused attendance analysis
- **Output**: Employee engagement patterns, team collaboration trends, well-being indicators
- **Format**: Markdown with actionable recommendations

#### 3. `generateAttendanceReport(attendanceData, timeRange)`
- **Purpose**: Professional HR reports
- **Sections**: Executive summary, engagement metrics, team dynamics, individual stories, action items
- **Focus**: Employee-centric, empathy-driven insights

#### 4. `generateSmartNotification(userData, context)`
- **Purpose**: Personalized motivational messages
- **Features**: Context-aware, productivity tips, encouragement
- **Limit**: 30 words maximum
- **Usage**: Triggered on check-in/out actions

#### 5. `getScheduleSuggestions(userData, teamData)`
- **Purpose**: Personalized work schedule recommendations
- **Output**: Optimal check-in times, work hours, office/remote recommendations

#### 6. `getTeamInsights(teamData)`
- **Purpose**: Team collaboration analysis
- **Output**: Availability patterns, meeting times, coordination opportunities

#### 7. `analyzeProductivity(userData, historicalData)`
- **Purpose**: Individual productivity analysis
- **Output**: Performance patterns, peak times, personalized tips

### AI API Endpoints

**Location**: `app/api/ai/`

#### 1. `/api/ai/notification` (POST)
```typescript
Request: { userData: any, context: string }
Response: { notification: string }
```
**Features:**
- Context-aware notification generation
- Automatic fallback messages on AI failure
- Response cleaning to remove reasoning patterns
- Non-blocking error handling

#### 2. `/api/ai/insights` (POST)
```typescript
Request: { attendanceData: any[], timeRange: string }
Response: { insights: string }
```

#### 3. `/api/ai/report` (POST)
```typescript
Request: { attendanceData: any[], timeRange: string }
Response: { report: string }
```

#### 4. `/api/ai/sentiment` (POST)
```typescript
Request: { moodData: any[], timeRange: string }
Response: { sentiment: string }
```

#### 5. `/api/admin/mood-data` (GET)
```typescript
Query: ?range=today|week|month
Response: { moodData: Array<{ mood: string, mood_comment: string, checkin_ts: string }> }
```

## Database Schema

### Core Tables

#### 1. `employees`
```sql
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  slug text UNIQUE GENERATED ALWAYS AS (
    regexp_replace(lower(full_name),'[^a-z0-9]+','-','g')
  ) STORED,
  email text UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

#### 2. `sessions`
```sql
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  checkin_ts timestamptz NOT NULL DEFAULT now(),
  checkout_ts timestamptz,
  mode text NOT NULL CHECK (mode IN ('office','remote')),
  ip inet,
  user_agent text,
  mood text CHECK (mood IN ('great', 'good', 'challenging', 'exhausted', 'productive')),
  mood_comment text
);

-- Indexes for mood analysis and session tracking
CREATE INDEX IF NOT EXISTS sessions_mood_idx ON public.sessions(mood, checkin_ts);
CREATE INDEX IF NOT EXISTS sessions_emp_checkin_idx ON public.sessions(employee_id, checkin_ts desc);
-- Ensure at most one open session per employee
CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_session_per_employee ON public.sessions(employee_id) WHERE checkout_ts IS NULL;
```

#### 3. `settings`
```sql
CREATE TABLE settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);
```

#### 4. `saved_responses`
```sql
CREATE TABLE saved_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Indexes and Constraints
- Unique constraint: One open session per employee
- Indexes: Employee check-in times, mood analysis, tags
- RLS (Row Level Security) enabled on all tables

## API Endpoints

### Core Attendance APIs

#### 1. `POST /api/checkin`
```typescript
Request: { fullName?: string, slug?: string, email?: string, mode: 'office' | 'remote' }
Response: { employee: any, session: any, message?: string }
```

#### 2. `POST /api/checkout`
```typescript
Request: { 
  slug: string, 
  email?: string, 
  mood?: 'great' | 'good' | 'challenging' | 'exhausted' | 'productive',
  moodComment?: string 
}
Response: { session: any }
```

#### 3. `GET /api/today/summary`
```typescript
Response: Array<{ full_name: string, lastIn: string, lastOut: string, workedHours: string, open: boolean }>
```

#### 4. `GET /api/summary/me`
```typescript
Query: ?slug=string OR ?fullName=string
Response: { full_name: string, lastIn: string, lastOut: string, workedMinutes: number }
```

### Admin APIs

#### 1. `GET /api/admin/stats`
```typescript
Query: ?range=week|fortnight|month|6months|year
Response: { totalEmployees: number, activeToday: number, officeCount: number, remoteCount: number, averageHours: number }
```

#### 2. `GET /api/admin/users`
```typescript
Response: Array<{ id: string, full_name: string, email: string, slug: string, active: boolean, created_at: string }>
```

#### 3. `POST /api/admin/users`
```typescript
Request: { fullName: string, email?: string }
Response: { success: boolean }
```

#### 4. `PUT /api/admin/users`
```typescript
Request: { id: string, fullName: string, email?: string, active: boolean }
Response: { success: boolean }
```

#### 5. `DELETE /api/admin/users`
```typescript
Query: ?id=string
Response: { success: boolean }
```

#### 6. `POST /api/admin/reset-sessions`
```typescript
Response: { message: string, count: number }
```

#### 7. `GET /api/admin/today-export`
```typescript
Response: CSV file download
```

### Authentication APIs

#### 1. `POST /api/admin/login`
```typescript
Request: { username: string, password: string }
Response: { success: boolean }
```

#### 2. `POST /api/admin/logout`
```typescript
Response: { success: boolean }
```

#### 3. `GET /api/admin/check-auth`
```typescript
Response: { authenticated: boolean }
```

## Authentication & Security

### Admin Authentication

**Location**: `lib/auth.ts`

**Key Functions:**
- `createAdminSession()` - Creates admin session
- `getAdminSession()` - Retrieves session from cookies
- `setAdminSession(session)` - Sets session cookie
- `clearAdminSession()` - Removes session
- `isAdminAuthenticated()` - Checks authentication status

**Security Features:**
- HTTP-only cookies
- 24-hour session duration
- Secure flag in production
- SameSite lax policy

### Database Security

**Row Level Security (RLS):**
- All tables have RLS enabled
- Policies allow appropriate access levels
- Service role for admin operations
- Anon role for public reads

**Data Protection:**
- UUID primary keys
- Input validation and sanitization
- SQL injection prevention via Supabase
- XSS protection via Next.js

## Styling & UI Components

### Design System

**Framework**: Tailwind CSS with custom components

**Color Palette:**
```css
--primary: 221.2 83.2% 53.3% (Purple)
--success: 22 163 74 (Green)
--warning: 245 158 11 (Yellow)
--danger: 220 38 38 (Red)
--muted: 215.4 16.3% 46.9% (Gray)
```

**Typography:**
- **Primary Font**: Source Sans Pro (Google Fonts)
- **Brand Font**: Cal Sans (Custom)
- **Weights**: 200, 300, 400, 600, 700, 900

### Component Library

**Location**: `components/ui/`

**Components:**
- `Button` - Primary, secondary, destructive variants
- `Card` - Content containers with headers
- `Input` - Form inputs with validation states
- `Badge` - Status indicators and labels
- `Table` - Data tables with sorting
- `Dialog` - Modal dialogs
- `Select` - Dropdown selections

### Custom UI Components

**Enhanced Hold Button:**
- Visual progress indicator with gradient animation
- Touch and mouse event handling
- Dynamic color changes (green for check-in, red for check-out)
- Glow effects during progress
- Responsive design with hover states

**Mood Selection Modal:**
- Grid layout with 5 mood options and emojis
- Interactive selection with visual feedback
- Optional textarea for mood comments
- Responsive design for mobile and desktop
- Smooth animations and transitions

**AI Notification Display:**
- Dismissible notification cards
- Context-aware styling
- Fallback message handling
- Non-blocking error states

### Custom CSS Classes

**Location**: `app/globals.css`

**Notion-inspired Styles:**
```css
.notion-card - Clean card containers
.notion-button-primary - Purple primary buttons
.notion-button-secondary - Gray secondary buttons
.notion-badge - Status badges with variants
.notion-tab - Tab navigation
.notion-input - Form inputs
```

**Animations:**
```css
.fade-in - Opacity transition
.slide-up - Slide up with opacity
```

### Responsive Design

**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

**Mobile-First Approach:**
- Stacked layouts on mobile
- Side-by-side on desktop
- Touch-friendly buttons
- Responsive tables with horizontal scroll

## Settings & Configuration

### Environment Variables

**Required:**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENROUTER_API_KEY=your_openrouter_key
TZ=Asia/Kolkata
```

**Optional:**
```bash
BC_CLIENT_ID=basecamp_client_id
BC_CLIENT_SECRET=basecamp_client_secret
BC_ACCOUNT_ID=basecamp_account_id
BC_PROJECT_ID=basecamp_project_id
BC_CHAT_ID=basecamp_chat_id
```

### Settings Management

**Location**: `lib/settings.ts`

**Functions:**
- `getSetting(key)` - Retrieves setting value
- `setSetting(key, value)` - Updates setting value

**Usage:**
- Basecamp OAuth tokens
- System configuration
- Feature flags

### Time Configuration

**Location**: `lib/time.ts`

**Settings:**
- Timezone: Asia/Kolkata (IST)
- Workdays: Monday to Friday
- Time format: 24-hour (HH:MM:SS)

## External Integrations

### Basecamp Integration

**Location**: `lib/basecamp.ts`

**Features:**
- OAuth 2.0 authentication
- Automatic token refresh
- Campfire message posting
- Error handling and retry logic

**API Endpoints:**
- `GET /api/basecamp/auth` - OAuth initiation
- `GET /api/basecamp/callback` - OAuth callback
- `POST /api/basecamp/webhook` - Webhook handling
- `POST /api/basecamp/create-chatbot` - Chatbot setup

### Google Sheets Export

**Status**: Guidance provided, implementation pending
**Requirements**: Google Cloud project, Sheets API, service account

### OpenRouter AI Integration

**Model**: Moonshot AI's Kimi K2
**Features**: 128K context window, advanced reasoning, code synthesis
**Fallback Models**: Google Gemma 3N, OpenAI GPT-OSS, Claude Haiku

## File Structure

```
checkin/
├── app/                          # Next.js 14 app directory
│   ├── admin/                    # Admin dashboard
│   │   ├── layout.tsx           # Admin layout with auth
│   │   ├── login/page.tsx       # Admin login
│   │   ├── page.tsx             # Main admin dashboard
│   │   └── saved-responses/     # Saved AI responses
│   ├── api/                     # API routes
│   │   ├── admin/               # Admin APIs
│   │   ├── ai/                  # AI integration APIs
│   │   ├── basecamp/            # Basecamp integration
│   │   ├── checkin/route.ts     # Check-in endpoint
│   │   ├── checkout/route.ts    # Check-out endpoint
│   │   └── today/summary/       # Today's data
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main user interface
│   └── providers.tsx            # React providers
├── components/                   # React components
│   ├── ui/                      # UI component library
│   └── save-response-modal.tsx  # Modal components
├── lib/                         # Utility libraries
│   ├── ai.ts                    # AI service functions
│   ├── auth.ts                  # Authentication utilities
│   ├── basecamp.ts              # Basecamp integration
│   ├── settings.ts              # Settings management
│   ├── supabase.ts              # Database client
│   ├── time.ts                  # Time utilities
│   └── utils.ts                 # General utilities
├── scripts/                     # Database scripts
├── supabase/                    # Database migrations
├── public/                      # Static assets
├── package.json                 # Dependencies
├── tailwind.config.js           # Tailwind configuration
└── types.ts                     # TypeScript types
```

## Performance Optimizations

### Frontend
- React 18 concurrent features
- Next.js 14 app router
- Image optimization
- Code splitting
- Lazy loading
- Optimized state management
- Efficient re-rendering with useCallback/useMemo

### Backend
- Supabase connection pooling
- API route caching
- Database indexing
- Efficient queries
- Optimized session handling

### AI Integration
- Model fallback system
- Rate limit handling
- Response caching
- Error recovery
- Non-blocking AI notifications
- Automatic retry logic

### User Experience
- Smooth animations and transitions
- Progressive enhancement
- Offline capability for session data
- Responsive design optimization
- Touch-friendly interactions

## Security Considerations

### Data Protection
- HTTPS enforcement
- Input validation
- SQL injection prevention
- XSS protection
- CSRF protection

### Authentication
- Secure session management
- HTTP-only cookies
- Session expiration
- Admin access control

### Privacy
- Minimal data collection
- GDPR compliance
- Data retention policies
- User consent

## Deployment

### Vercel Deployment
- Automatic deployments
- Environment variable management
- Edge functions support
- Global CDN

### Database
- Supabase hosted PostgreSQL
- Automatic backups
- Point-in-time recovery
- Connection pooling

### Monitoring
- Error tracking
- Performance monitoring
- Usage analytics
- Health checks

## Recent Updates & Enhancements

### Enhanced Check-in/Check-out Experience
- **Improved Hold-to-Confirm Button**: Added visual progress indicator with gradient animation and real-time feedback
- **Advanced Mood Tracking**: Implemented comprehensive mood selection with 5 options and optional comments
- **AI-Powered Notifications**: Integrated smart notifications that generate during the hold process
- **Enhanced Session Display**: Dynamic status badges showing real-time session information
- **Improved Error Handling**: Better fallback mechanisms and user feedback

### UI/UX Improvements
- **Touch-Friendly Design**: Enhanced mobile experience with proper touch event handling
- **Visual Feedback**: Progress indicators, animations, and state changes for better user interaction
- **Modal Interfaces**: Improved mood selection modal with grid layout and emoji support
- **Responsive Enhancements**: Better mobile and desktop layouts with optimized spacing

### Technical Enhancements
- **Session Management**: Improved localStorage handling and session restoration
- **API Robustness**: Better error handling and fallback mechanisms
- **Performance Optimization**: Optimized state management and re-rendering
- **Database Indexing**: Added indexes for mood analysis and session tracking

This documentation provides a comprehensive overview of the INSYDE attendance management system, covering all functions, APIs, styling, and technical implementation details, including recent enhancements and improvements.
