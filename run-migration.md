# Database Migration Instructions

## 🚀 Run the Migration in Supabase

1. **Open your Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `mfbgnipqkkkredgmediu`

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste the Migration**
   - Copy the entire contents of `supabase_leave_migration.sql`
   - Paste it into the SQL editor
   - Click "Run" button

4. **Verify the Migration**
   - You should see "Success" message
   - Check that tables were created by going to "Table Editor"
   - You should see: `leave_types`, `leave_balances`, `leave_requests`, `leave_accruals`

## 🔄 After Migration

Once the migration is complete, run:

```bash
npm run initialize-leave
```

This will set up default leave balances for all existing employees.

## ✅ Test the System

1. Refresh your browser at `http://localhost:3002`
2. Click the "Leave Management" button
3. The leave page should now load successfully!

---

**Need the migration SQL?** Open `supabase_leave_migration.sql` in your project.
