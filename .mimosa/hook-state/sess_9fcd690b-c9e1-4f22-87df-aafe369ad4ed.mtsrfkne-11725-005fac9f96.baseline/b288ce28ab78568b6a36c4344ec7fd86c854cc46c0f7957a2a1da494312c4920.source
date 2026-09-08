require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const dummyEmployees = [
  { full_name: 'Abhijeet Kumar', email: 'abhijeet@insyde.com' },
  { full_name: 'Rizvi Ahmed', email: 'rizvi@insyde.com' },
  { full_name: 'Khushi Patel', email: 'khushi@insyde.com' },
  { full_name: 'Arjun Singh', email: 'arjun@insyde.com' },
  { full_name: 'Priya Sharma', email: 'priya@insyde.com' },
  { full_name: 'Vikram Malhotra', email: 'vikram@insyde.com' },
  { full_name: 'Anjali Desai', email: 'anjali@insyde.com' },
  { full_name: 'Rahul Verma', email: 'rahul@insyde.com' },
  { full_name: 'Meera Iyer', email: 'meera@insyde.com' },
  { full_name: 'Siddharth Joshi', email: 'siddharth@insyde.com' },
  { full_name: 'Zara Khan', email: 'zara@insyde.com' },
  { full_name: 'Aditya Rao', email: 'aditya@insyde.com' },
  { full_name: 'Neha Gupta', email: 'neha@insyde.com' },
  { full_name: 'Karan Mehta', email: 'karan@insyde.com' },
  { full_name: 'Ishita Reddy', email: 'ishita@insyde.com' },
  { full_name: 'Dhruv Kapoor', email: 'dhruv@insyde.com' },
  { full_name: 'Tanvi Nair', email: 'tanvi@insyde.com' },
  { full_name: 'Aryan Bhatt', email: 'aryan@insyde.com' },
  { full_name: 'Sana Sheikh', email: 'sana@insyde.com' },
  { full_name: 'Rohan Das', email: 'rohan@insyde.com' },
  { full_name: 'Kavya Menon', email: 'kavya@insyde.com' },
  { full_name: 'Vedant Saxena', email: 'vedant@insyde.com' },
  { full_name: 'Aisha Khan', email: 'aisha@insyde.com' },
  { full_name: 'Dev Malhotra', email: 'dev@insyde.com' },
  { full_name: 'Riya Chopra', email: 'riya@insyde.com' }
];

async function resetAndSeed() {
  console.log('🗑️  Starting database reset and seed...');
  
  try {
    // Delete all sessions first (due to foreign key constraint)
    console.log('🗑️  Deleting all sessions...');
    const { error: sessionsError } = await supabase
      .from('sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (sessionsError) {
      console.error('❌ Error deleting sessions:', sessionsError);
      return;
    }
    console.log('✅ Sessions deleted');
    
    // Delete all employees
    console.log('🗑️  Deleting all employees...');
    const { error: employeesError } = await supabase
      .from('employees')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (employeesError) {
      console.error('❌ Error deleting employees:', employeesError);
      return;
    }
    console.log('✅ Employees deleted');
    
    // Insert dummy employees
    console.log('🌱 Inserting dummy employees...');
    const { data, error } = await supabase
      .from('employees')
      .insert(dummyEmployees);
    
    if (error) {
      console.error('❌ Error inserting dummy employees:', error);
      return;
    }
    
    console.log(`✅ Successfully seeded ${dummyEmployees.length} dummy employees!`);
    console.log('📋 Employee list:');
    dummyEmployees.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.full_name} (${emp.slug})`);
    });
    
    // Create some sample sessions for testing
    await createSampleSessions();
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function createSampleSessions() {
  console.log('\n📊 Creating sample sessions for testing...');
  
  // First, get the actual employees with their generated slugs
  const { data: employees, error: fetchError } = await supabase
    .from('employees')
    .select('id, slug, full_name')
    .limit(8);
  
  if (fetchError) {
    console.error('❌ Error fetching employees:', fetchError);
    return;
  }
  
  const sampleSessions = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Create sessions for the last 7 days for a few employees
  const testEmployees = employees || [];
  
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const sessionDate = new Date(today);
    sessionDate.setDate(sessionDate.getDate() - dayOffset);
    
    testEmployees.forEach((employee, index) => {
      // Skip some days randomly to simulate real attendance patterns
      if (Math.random() > 0.3) { // 70% attendance rate
        const checkinTime = new Date(sessionDate);
        checkinTime.setHours(9 + Math.floor(Math.random() * 2)); // 9-10 AM
        checkinTime.setMinutes(Math.floor(Math.random() * 60));
        
        const checkoutTime = new Date(sessionDate);
        checkoutTime.setHours(17 + Math.floor(Math.random() * 3)); // 5-7 PM
        checkoutTime.setMinutes(Math.floor(Math.random() * 60));
        
        const mode = Math.random() > 0.6 ? 'office' : 'remote'; // 40% office, 60% remote
        
        sampleSessions.push({
          employee_id: employee.id,
          checkin_ts: checkinTime.toISOString(),
          checkout_ts: checkoutTime.toISOString(),
          mode: mode,
          mood: ['great', 'good', 'challenging', 'exhausted', 'productive'][Math.floor(Math.random() * 5)],
          mood_comment: ['Great day!', 'Productive session', 'Feeling good', 'Making progress', 'Good vibes'][Math.floor(Math.random() * 5)]
        });
      }
    });
  }
  
  if (sampleSessions.length > 0) {
    const { error } = await supabase
      .from('sessions')
      .insert(sampleSessions);
    
    if (error) {
      console.error('❌ Error inserting sample sessions:', error);
    } else {
      console.log(`✅ Created ${sampleSessions.length} sample sessions!`);
    }
  }
}

// Run the reset and seed function
resetAndSeed()
  .then(() => {
    console.log('\n🎉 Database reset and seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Reset and seeding failed:', error);
    process.exit(1);
  });
