require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BCRYPT_ROUNDS = 10;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupPins() {
  console.log('🔐 PIN Setup Script');
  console.log('==================\n');

  try {
    // Fetch all employees
    console.log('📋 Fetching employees...');
    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select('id, full_name, email, slug, pin_hash, active')
      .order('full_name');

    if (fetchError) {
      console.error('❌ Error fetching employees:', fetchError);
      process.exit(1);
    }

    if (!employees || employees.length === 0) {
      console.log('⚠️  No employees found in database.');
      process.exit(0);
    }

    console.log(`✅ Found ${employees.length} employees\n`);

    // Filter employees without PINs
    const employeesWithoutPins = employees.filter(emp => !emp.pin_hash && emp.active);
    const employeesWithPins = employees.filter(emp => emp.pin_hash);

    if (employeesWithPins.length > 0) {
      console.log(`ℹ️  ${employeesWithPins.length} employee(s) already have PINs set.`);
    }

    if (employeesWithoutPins.length === 0) {
      console.log('✅ All active employees already have PINs set.');
      rl.close();
      process.exit(0);
    }

    console.log(`📝 ${employeesWithoutPins.length} active employee(s) need PINs.\n`);

    // Ask for setup mode
    console.log('Setup options:');
    console.log('1. Set default PIN "2025" for all employees (requires change on first login)');
    console.log('2. Generate random PINs for all employees');
    console.log('3. Set the same PIN for all employees (e.g., "0000" for testing)');
    console.log('4. Set PINs individually');
    console.log('5. Cancel\n');

    const choice = await question('Choose an option (1-5): ');

    let pinAssignments = [];

    if (choice === '1') {
      // Default PIN 2025 - requires change on first login
      console.log('\n🔐 Setting default PIN "2025" for all employees...');
      console.log('   (Users will be required to change PIN on first login)\n');
      for (const emp of employeesWithoutPins) {
        pinAssignments.push({ employee: emp, pin: '2025', requiresChange: true });
      }
    } else if (choice === '2') {
      // Generate random PINs
      console.log('\n🎲 Generating random PINs...');
      for (const emp of employeesWithoutPins) {
        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        pinAssignments.push({ employee: emp, pin: randomPin, requiresChange: false });
      }
    } else if (choice === '3') {
      // Same PIN for all
      const commonPin = await question('\nEnter 4-digit PIN to use for all employees: ');
      if (!/^\d{4}$/.test(commonPin)) {
        console.error('❌ Invalid PIN. Must be exactly 4 digits.');
        rl.close();
        process.exit(1);
      }
      const requireChange = await question('Require PIN change on first login? (yes/no, default: no): ');
      const requiresChange = requireChange.toLowerCase() === 'yes';
      for (const emp of employeesWithoutPins) {
        pinAssignments.push({ employee: emp, pin: commonPin, requiresChange });
      }
    } else if (choice === '4') {
      // Individual PINs
      console.log('\n📝 Setting PINs individually...\n');
      for (const emp of employeesWithoutPins) {
        let pin = '';
        while (!/^\d{4}$/.test(pin)) {
          pin = await question(`Enter PIN for ${emp.full_name} (4 digits, or 'skip' to skip): `);
          if (pin.toLowerCase() === 'skip') {
            console.log(`⏭️  Skipped ${emp.full_name}\n`);
            break;
          }
          if (!/^\d{4}$/.test(pin)) {
            console.log('❌ Invalid PIN. Must be exactly 4 digits.\n');
          }
        }
        if (pin && /^\d{4}$/.test(pin)) {
          const requireChange = await question('Require PIN change on first login? (yes/no, default: no): ');
          const requiresChange = requireChange.toLowerCase() === 'yes';
          pinAssignments.push({ employee: emp, pin, requiresChange });
        }
      }
    } else {
      console.log('❌ Cancelled.');
      rl.close();
      process.exit(0);
    }

    if (pinAssignments.length === 0) {
      console.log('⚠️  No PINs to set.');
      rl.close();
      process.exit(0);
    }

    // Confirm before proceeding
    console.log(`\n📋 Summary:`);
    console.log(`   ${pinAssignments.length} PIN(s) will be set.\n`);
    const confirm = await question('Proceed? (yes/no): ');

    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Cancelled.');
      rl.close();
      process.exit(0);
    }

    // Set PINs
    console.log('\n🔐 Setting PINs...\n');
    const results = [];

    for (const assignment of pinAssignments) {
      try {
        const pinHash = await bcrypt.hash(assignment.pin, BCRYPT_ROUNDS);
        
        const updateData = {
          pin_hash: pinHash,
          pin_change_required: assignment.requiresChange || false
        };
        
        const { error: updateError } = await supabase
          .from('employees')
          .update(updateData)
          .eq('id', assignment.employee.id);

        if (updateError) {
          console.error(`❌ Failed to set PIN for ${assignment.employee.full_name}:`, updateError.message);
          results.push({ ...assignment, success: false, error: updateError.message });
        } else {
          const changeNote = assignment.requiresChange ? ' (change required on first login)' : '';
          console.log(`✅ Set PIN for ${assignment.employee.full_name}${changeNote}`);
          results.push({ ...assignment, success: true });
        }
      } catch (error) {
        console.error(`❌ Error setting PIN for ${assignment.employee.full_name}:`, error.message);
        results.push({ ...assignment, success: false, error: error.message });
      }
    }

    // Summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);

    // Export PIN list
    if (successCount > 0) {
      console.log('\n📄 PIN List (for secure distribution):\n');
      console.log('Employee Name,Email,PIN');
      results
        .filter(r => r.success)
        .forEach(r => {
          console.log(`"${r.employee.full_name}","${r.employee.email || 'N/A'}",${r.pin}`);
        });

      // Ask if user wants to save to file
      const saveToFile = await question('\n💾 Save PIN list to file? (yes/no): ');
      if (saveToFile.toLowerCase() === 'yes') {
        const fs = require('fs');
        const filename = `employee-pins-${new Date().toISOString().split('T')[0]}.csv`;
        const csvContent = [
          'Employee Name,Email,PIN',
          ...results
            .filter(r => r.success)
            .map(r => `"${r.employee.full_name}","${r.employee.email || 'N/A'}",${r.pin}`)
        ].join('\n');

        fs.writeFileSync(filename, csvContent);
        console.log(`✅ PIN list saved to ${filename}`);
        console.log('⚠️  IMPORTANT: Keep this file secure and delete it after distributing PINs to employees.');
      }
    }

    if (failCount > 0) {
      console.log('\n⚠️  Failed assignments:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   ${r.employee.full_name}: ${r.error || 'Unknown error'}`);
        });
    }

    console.log('\n✅ PIN setup complete!');
    rl.close();

  } catch (error) {
    console.error('❌ Fatal error:', error);
    rl.close();
    process.exit(1);
  }
}

// Run the script
setupPins();

