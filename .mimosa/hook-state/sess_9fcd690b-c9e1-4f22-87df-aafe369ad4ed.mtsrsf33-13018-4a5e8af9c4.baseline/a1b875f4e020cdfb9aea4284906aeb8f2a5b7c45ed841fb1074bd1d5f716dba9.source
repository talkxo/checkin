const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initializeLeaveSystem() {
  try {
    console.log('🚀 Initializing Leave Management System...');

    // Get all active employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name')
      .eq('active', true);

    if (empError) {
      throw new Error(`Failed to fetch employees: ${empError.message}`);
    }

    console.log(`Found ${employees.length} active employees`);

    // Get leave types
    const { data: leaveTypes, error: typeError } = await supabase
      .from('leave_types')
      .select('id, name');

    if (typeError) {
      throw new Error(`Failed to fetch leave types: ${typeError.message}`);
    }

    console.log('Available leave types:', leaveTypes.map(lt => lt.name));

    const currentYear = new Date().getFullYear();
    let successCount = 0;
    let errorCount = 0;

    // Initialize leave balances for each employee
    for (const employee of employees) {
      console.log(`Processing employee: ${employee.full_name}`);

      for (const leaveType of leaveTypes) {
        let initialEntitlement = 0;

        // Set default entitlements based on leave type
        switch (leaveType.name) {
          case 'Privilege Leave':
            initialEntitlement = 15; // 15 days per year
            break;
          case 'Sick Leave':
            initialEntitlement = 10; // 10 days per year
            break;
          case 'Bonus Leave':
            initialEntitlement = 0; // Starts at 0, earned through attendance
            break;
          default:
            initialEntitlement = 0;
        }

        try {
          // Insert or update leave balance
          const { error: balanceError } = await supabase
            .from('leave_balances')
            .upsert({
              employee_id: employee.id,
              leave_type_id: leaveType.id,
              year: currentYear,
              total_entitlement: initialEntitlement,
              used_leaves: 0,
              pending_leaves: 0
            }, {
              onConflict: 'employee_id,leave_type_id,year'
            });

          if (balanceError) {
            console.error(`Error setting balance for ${employee.full_name} - ${leaveType.name}:`, balanceError.message);
            errorCount++;
          } else {
            console.log(`✓ Set ${initialEntitlement} ${leaveType.name} for ${employee.full_name}`);
            successCount++;
          }
        } catch (error) {
          console.error(`Error processing ${employee.full_name} - ${leaveType.name}:`, error.message);
          errorCount++;
        }
      }
    }

    console.log('\n📊 Initialization Summary:');
    console.log(`✅ Successful operations: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`👥 Employees processed: ${employees.length}`);

    // Process initial monthly accrual for current month
    console.log('\n🔄 Processing initial monthly accrual...');
    const currentMonth = new Date().getMonth() + 1;
    
    const { error: accrualError } = await supabase
      .rpc('process_monthly_leave_accrual', {
        target_year: currentYear,
        target_month: currentMonth
      });

    if (accrualError) {
      console.error('Error processing initial accrual:', accrualError.message);
    } else {
      console.log('✓ Initial monthly accrual processed');
    }

    console.log('\n🎉 Leave Management System initialization complete!');
    console.log('\nNext steps:');
    console.log('1. Run the database migration: supabase_leave_migration.sql');
    console.log('2. Access the leave management at: /leave');
    console.log('3. Access admin panel at: /admin/leave');
    console.log('4. Set up a cron job to run monthly accrual processing');

  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    process.exit(1);
  }
}

// Run the initialization
initializeLeaveSystem();
