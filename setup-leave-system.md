# Leave Management System Setup Guide

## 🚀 Quick Setup Steps

### Step 1: Run Database Migration

1. **Go to your Supabase Dashboard**
   - Navigate to your project at: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Execute the Migration**
   - Copy the entire contents of `supabase_leave_migration.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute

### Step 2: Initialize the System

Run this command in your terminal:

```bash
npm run initialize-leave
```

### Step 3: Test the System

1. **Refresh your browser** at `http://localhost:3002`
2. **Click the "Leave Management" button** next to your greeting
3. **Verify the leave page loads** without errors

## 🔧 Alternative: Manual Setup

If the npm script doesn't work, you can run the initialization manually:

```bash
node scripts/initialize-leave-system.js
```

## 🐛 Troubleshooting

### If you get "relation does not exist" errors:
- Make sure you've run the database migration first
- Check that all tables were created successfully

### If the initialization script fails:
- Verify your Supabase environment variables are set correctly
- Check that you have the service role key configured

### If the leave page still shows errors:
- Check the browser console for specific error messages
- Verify the API endpoints are working by testing them directly

## 📊 What to Expect After Setup

Once everything is working, you should see:

- **Leave Balance Overview**: Cards showing different leave types
- **Bonus Leave Accrual**: History of bonus leaves earned
- **Request Form**: Ability to submit new leave requests
- **Admin Panel**: Available at `/admin/leave`

## 🎯 Next Steps

1. **Test leave request submission**
2. **Set up admin access** for the admin panel
3. **Configure monthly accrual processing**
4. **Customize leave policies** if needed

---

**Need help?** Check the `LEAVE_MANAGEMENT_README.md` for detailed documentation.
