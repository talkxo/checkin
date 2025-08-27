const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDefaultLeaves() {
  try {
    console.log('🚀 Setting up default leave balances...');

    // First, create leave types if they don't exist
    console.log('Creating leave types...');
    const { error: typeError } = await supabase
      .from('leave_types')
      .upsert([
        { name: 'Privilege Leave', description: 'Standard annual privilege leaves' },
        { name: 'Sick Leave', description: 'Medical and health-related leaves' },
        { name: 'Bonus Leave', description: 'Leaves earned from extra office attendance' }
      ], { onConflict: 'name' });

    if (typeError) {
      console.error('Error creating leave types:', typeError);
      return;
    }

    console.log('✓ Leave types created');

    // Get all employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name')
      .eq('active', true);

    if (empError) {
      console.error('Error fetching employees:', empError);
      return;
    }

    console.log(`Found ${employees.length} employees`);

    // Get leave types
    const { data: leaveTypes, error: typeFetchError } = await supabase
      .from('leave_types')
      .select('id, name');

    if (typeFetchError) {
      console.error('Error fetching leave types:', typeFetchError);
      return;
    }

    const currentYear = new Date().getFullYear();
    let successCount = 0;

    // Set up default balances for each employee
    for (const employee of employees) {
      console.log(`Setting up leaves for: ${employee.full_name}`);

      for (const leaveType of leaveTypes) {
        let defaultEntitlement = 0;

        // Set default entitlements
        switch (leaveType.name) {
          case 'Privilege Leave':
            defaultEntitlement = 15; // 15 days per year
            break;
          case 'Sick Leave':
            defaultEntitlement = 10; // 10 days per year
            break;
          case 'Bonus Leave':
            defaultEntitlement = 0; // Starts at 0, earned through attendance
            break;
          default:
            defaultEntitlement = 0;
        }

        try {
          // Insert or update leave balance
          const { error: balanceError } = await supabase
            .from('leave_balances')
            .upsert({
              employee_id: employee.id,
              leave_type_id: leaveType.id,
              year: currentYear,
              total_entitlement: defaultEntitlement,
              used_leaves: 0,
              pending_leaves: 0
            }, {
              onConflict: 'employee_id,leave_type_id,year'
            });

          if (balanceError) {
            console.error(`Error setting balance for ${employee.full_name} - ${leaveType.name}:`, balanceError);
          } else {
            console.log(`✓ Set ${defaultEntitlement} ${leaveType.name} for ${employee.full_name}`);
            successCount++;
          }
        } catch (error) {
          console.error(`Error processing ${employee.full_name} - ${leaveType.name}:`, error.message);
        }
      }
    }

    console.log('\n📊 Setup Summary:');
    console.log(`✅ Successful operations: ${successCount}`);
    console.log(`👥 Employees processed: ${employees.length}`);

    console.log('\n🎉 Default leave balances set up successfully!');
    console.log('\nYou can now:');
    console.log('1. Refresh your browser at http://localhost:3002');
    console.log('2. Click the "Leave Management" button');
    console.log('3. See your leave balances and submit requests');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupDefaultLeaves();
