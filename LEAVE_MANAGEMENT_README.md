# Leave Management System

A comprehensive leave management system built on top of the existing attendance module, featuring automated bonus leave accrual based on extra office attendance.

## 🎯 Overview

The Leave Management system provides:

- **Standard Leave Types**: Privilege Leave (15 days/year), Sick Leave (10 days/year)
- **Bonus Leave System**: Automatically earned from extra office attendance
- **Leave Request Workflow**: Submit, approve, and track leave requests
- **Unified Dashboard**: View all leave balances and history in one place
- **Admin Panel**: Manage and approve leave requests

## 🏗️ Architecture

### Database Schema

The system adds several new tables to the existing attendance database:

- `leave_types`: Defines different types of leaves
- `leave_balances`: Tracks employee leave balances by year
- `leave_requests`: Stores leave request submissions
- `leave_accruals`: Tracks bonus leave accrual history

### Key Features

1. **Automated Bonus Leave Accrual**
   - Formula: `Bonus Leaves = floor(Extra Office Days / 3)`
   - Yearly cap: 15 bonus leaves maximum
   - Monthly calculation based on attendance data

2. **Leave Request Management**
   - Submit requests with date range and reason
   - Automatic weekend exclusion
   - Balance validation before submission
   - Admin approval workflow

3. **Real-time Balance Tracking**
   - Available, used, and pending leave counts
   - Visual progress indicators
   - Historical accrual tracking

## 🚀 Setup Instructions

### 1. Database Migration

Run the database migration to create the necessary tables and functions:

```sql
-- Execute the contents of supabase_leave_migration.sql
```

### 2. Initialize the System

Run the initialization script to set up default leave balances for existing employees:

```bash
npm run initialize-leave
```

Or manually:

```bash
node scripts/initialize-leave-system.js
```

### 3. Access the System

- **Employee Dashboard**: `/leave`
- **Admin Panel**: `/admin/leave`

## 📊 Bonus Leave Calculation

### How It Works

1. **Expected Office Days**: 12 days per month (3 days/week × 4 weeks)
2. **Extra Days Calculation**: `Actual Office Days - Expected Office Days`
3. **Bonus Leave Formula**: `floor(Extra Office Days / 3)`
4. **Yearly Cap**: Maximum 15 bonus leaves per calendar year

### Example

If an employee works 5 days in the office every week:
- **Monthly Extra Days**: 5 days/week × 4 weeks - 12 expected = 8 extra days
- **Monthly Bonus Leaves**: floor(8/3) = 2 bonus leaves
- **Yearly Total**: 2 × 12 months = 24, but capped at 15

## 🔧 API Endpoints

### Employee Endpoints

- `GET /api/leave/balance` - Get employee leave balance
- `GET /api/leave/types` - Get available leave types
- `POST /api/leave/request` - Submit leave request
- `GET /api/leave/request` - Get employee's leave requests

### Admin Endpoints

- `GET /api/admin/leave-requests` - Get all leave requests
- `POST /api/admin/leave-requests/process` - Approve/reject requests
- `POST /api/leave/accrual` - Trigger monthly accrual processing

## 🎨 UI Components

### LeaveManagement Component

Main employee dashboard featuring:
- Leave balance overview with visual indicators
- Bonus leave accrual history
- Leave request submission form
- Recent requests table
- Information cards explaining the system

### AdminLeaveManagement Component

Admin panel featuring:
- All leave requests table with filtering
- Approve/reject functionality
- Monthly accrual processing trigger
- Request details and action dialogs

## 🔄 Monthly Accrual Processing

### Automatic Processing

The system includes a function to process monthly bonus leave accrual:

```sql
SELECT process_monthly_leave_accrual(target_year, target_month);
```

### Manual Processing

Admins can trigger accrual processing via:
- Admin panel button
- API endpoint: `POST /api/leave/accrual`

### Cron Job Setup

Recommended cron job for automatic monthly processing:

```bash
# Run on the 1st of each month at 2 AM
0 2 1 * * curl -X POST https://your-domain.com/api/leave/accrual
```

## 📋 Leave Request Workflow

1. **Employee submits request** with date range and reason
2. **System validates** available balance and date range
3. **Request is marked as pending** and balance is temporarily reserved
4. **Admin reviews** the request in the admin panel
5. **Admin approves/rejects** with optional rejection reason
6. **System updates** leave balance accordingly

## 🎯 Integration with Attendance

The leave system integrates seamlessly with the existing attendance module:

- **Data Source**: Uses existing `sessions` table for office day calculations
- **Real-time Updates**: Bonus leaves calculated from actual attendance data
- **Consistent UI**: Matches existing design patterns and styling
- **Shared Authentication**: Uses existing employee identification system

## 🔒 Security & Permissions

- **Row Level Security**: All tables have appropriate RLS policies
- **Employee Access**: Employees can only view their own data
- **Admin Access**: Admins can view and manage all requests
- **Data Validation**: All inputs validated on both client and server

## 📈 Monitoring & Analytics

### Key Metrics

- Total leave requests by status
- Bonus leave accrual rates
- Leave utilization patterns
- Approval/rejection ratios

### Admin Dashboard Features

- Filter requests by status, employee, date range
- Bulk operations for multiple requests
- Export functionality for reporting
- Real-time updates and notifications

## 🛠️ Customization

### Adding New Leave Types

1. Insert into `leave_types` table
2. Update initialization script with default entitlements
3. Add UI components if needed

### Modifying Accrual Rules

Edit the `calculate_bonus_leaves` function:

```sql
CREATE OR REPLACE FUNCTION public.calculate_bonus_leaves(
  extra_office_days integer
) RETURNS integer LANGUAGE plpgsql AS $$
BEGIN
  -- Customize the formula here
  RETURN LEAST(FLOOR(extra_office_days / 3.0), 15);
END;
$$;
```

## 🐛 Troubleshooting

### Common Issues

1. **Leave balance not updating**
   - Check if monthly accrual has been processed
   - Verify attendance data exists for the employee

2. **Bonus leaves not calculating**
   - Ensure office sessions are marked as 'office' mode
   - Check if sessions have checkout timestamps

3. **Request submission failing**
   - Verify employee has sufficient balance
   - Check date range validity (no weekends)

### Debug Commands

```sql
-- Check employee attendance for a month
SELECT COUNT(DISTINCT DATE(checkin_ts)) as office_days
FROM sessions 
WHERE employee_id = 'employee-uuid'
  AND mode = 'office'
  AND EXTRACT(YEAR FROM checkin_ts) = 2024
  AND EXTRACT(MONTH FROM checkin_ts) = 1;

-- Check leave balance
SELECT * FROM leave_balances 
WHERE employee_id = 'employee-uuid' 
  AND year = 2024;
```

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the database logs for errors
3. Verify all migrations have been applied
4. Ensure the initialization script has been run

## 🔮 Future Enhancements

Potential improvements for future versions:

- **Email Notifications**: Automatic notifications for request status changes
- **Calendar Integration**: Sync with external calendar systems
- **Advanced Reporting**: Detailed analytics and reporting dashboard
- **Mobile App**: Native mobile application for leave management
- **Team Calendar**: View team leave schedules
- **Leave Policies**: Configurable leave policies per department/role
