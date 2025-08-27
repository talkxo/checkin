# Local Development Setup Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account and project
- OpenRouter API key (optional, for AI features)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Environment Configuration

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# AI Integration (Optional - for AI features)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Timezone Configuration
TZ=Asia/Kolkata

# Basecamp Integration (Optional)
BC_CLIENT_ID=your_basecamp_client_id_here
BC_CLIENT_SECRET=your_basecamp_client_secret_here
BC_ACCOUNT_ID=your_basecamp_account_id_here
BC_PROJECT_ID=your_basecamp_project_id_here
BC_CHAT_ID=your_basecamp_chat_id_here

# App URL (for local development)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 3: Supabase Setup

### 3.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and API keys

### 3.2 Database Setup
Run the SQL commands from `supabase.sql` in your Supabase SQL editor:

```sql
-- Run the contents of supabase.sql in your Supabase SQL editor
-- This creates the necessary tables and policies
```

### 3.3 Get API Keys
From your Supabase project dashboard:
- **Project URL**: Settings → API → Project URL
- **Anon Key**: Settings → API → Project API keys → anon public
- **Service Role Key**: Settings → API → Project API keys → service_role secret

## Step 4: OpenRouter AI Setup (Optional)

For AI features (smart notifications, insights, reports):

1. Go to [openrouter.ai](https://openrouter.ai)
2. Create an account and get your API key
3. Add the key to your `.env.local` file

## Step 5: Seed Test Data

```bash
# Seed dummy employees and sample sessions
npm run seed
```

## Step 6: Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Step 7: Admin Access

- **URL**: `http://localhost:3000/admin`
- **Username**: `admin`
- **Password**: `talkxo2024`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run seed` - Seed dummy data
- `npm run reset-seed` - Reset and reseed data

## Testing the App

### Employee Check-in/Check-out
1. Visit `http://localhost:3000`
2. Type an employee name (e.g., "Khushi")
3. Select from suggestions
4. Hold the check-in button for 2.5 seconds
5. Check out with mood tracking

### Admin Dashboard
1. Visit `http://localhost:3000/admin`
2. Login with admin credentials
3. View analytics, manage users, generate AI insights

### Per-user URLs
- Individual check-in pages: `http://localhost:3000/u/[slug]`
- Example: `http://localhost:3000/u/khushi-patel`

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   - Ensure `.env.local` is in the root directory
   - Restart the development server after changes

2. **Supabase Connection Issues**
   - Verify API keys are correct
   - Check if Supabase project is active
   - Ensure database tables are created

3. **AI Features Not Working**
   - Verify OpenRouter API key is set
   - Check browser console for errors
   - AI features will gracefully degrade if not configured

4. **Port Already in Use**
   - Change port: `npm run dev -- -p 3001`
   - Or kill existing process on port 3000

### Debug Mode

The app includes extensive logging. Check the browser console and terminal for debug information.

## Production Deployment

For production deployment:
1. Set up environment variables in your hosting platform
2. Run `npm run build`
3. Deploy the `.next` folder
4. Ensure all environment variables are configured

## Support

- Check the `APP_DOCUMENTATION.md` for detailed technical information
- Review `FEATURES.md` for feature overview
- Database schema is in `supabase.sql`
