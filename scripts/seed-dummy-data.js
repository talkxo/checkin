require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const dummyEmployees = [
  { full_name: 'Abhijeet Kumar', slug: 'abhijeet-kumar', email: 'abhijeet@insyde.com' },
  { full_name: 'Rizvi Ahmed', slug: 'rizvi-ahmed', email: 'rizvi@insyde.com' },
  { full_name: 'Khushi Patel', slug: 'khushi-patel', email: 'khushi@insyde.com' },
  { full_name: 'Arjun Singh', slug: 'arjun-singh', email: 'arjun@insyde.com' },
  { full_name: 'Priya Sharma', slug: 'priya-sharma', email: 'priya@insyde.com' },
  { full_name: 'Vikram Malhotra', slug: 'vikram-malhotra', email: 'vikram@insyde.com' },
  { full_name: 'Anjali Desai', slug: 'anjali-desai', email: 'anjali@insyde.com' },
  { full_name: 'Rahul Verma', slug: 'rahul-verma', email: 'rahul@insyde.com' },
  { full_name: 'Meera Iyer', slug: 'meera-iyer', email: 'meera@insyde.com' },
  { full_name: 'Siddharth Joshi', slug: 'siddharth-joshi', email: 'siddharth@insyde.com' },
  { full_name: 'Zara Khan', slug: 'zara-khan', email: 'zara@insyde.com' },
  { full_name: 'Aditya Rao', slug: 'aditya-rao', email: 'aditya@insyde.com' },
  { full_name: 'Neha Gupta', slug: 'neha-gupta', email: 'neha@insyde.com' },
  { full_name: 'Karan Mehta', slug: 'karan-mehta', email: 'karan@insyde.com' },
  { full_name: 'Ishita Reddy', slug: 'ishita-reddy', email: 'ishita@insyde.com' },
  { full_name: 'Dhruv Kapoor', slug: 'dhruv-kapoor', email: 'dhruv@insyde.com' },
  { full_name: 'Tanvi Nair', slug: 'tanvi-nair', email: 'tanvi@insyde.com' },
  { full_name: 'Aryan Bhatt', slug: 'aryan-bhatt', email: 'aryan@insyde.com' },
  { full_name: 'Sana Sheikh', slug: 'sana-sheikh', email: 'sana@insyde.com' },
  { full_name: 'Rohan Das', slug: 'rohan-das', email: 'rohan@insyde.com' },
  { full_name: 'Kavya Menon', slug: 'kavya-menon', email: 'kavya@insyde.com' },
  { full_name: 'Vedant Saxena', slug: 'vedant-saxena', email: 'vedant@insyde.com' },
  { full_name: 'Aisha Khan', slug: 'aisha-khan', email: 'aisha@insyde.com' },
  { full_name: 'Dev Malhotra', slug: 'dev-malhotra', email: 'dev@insyde.com' },
  { full_name: 'Riya Chopra', slug: 'riya-chopra', email: 'riya@insyde.com' }
];

async function seedDummyData() {
  console.log('🌱 Starting to seed dummy employee data...');
  
  try {
    // Check if employees already exist
    const { data: existingEmployees, error: checkError } = await supabase
      .from('employees')
      .select('full_name')
      .limit(1);
    
    if (checkError) {
      console.error('❌ Error checking existing employees:', checkError);
      return;
    }
    
    if (existingEmployees && existingEmployees.length > 0) {
      console.log('⚠️  Employees already exist in database. Skipping seed.');
      return;
    }
    
    // Insert dummy employees
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
  
  const sampleSessions = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Create sessions for the last 7 days for a few employees
  const testEmployees = dummyEmployees.slice(0, 8); // First 8 employees
  
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
          employee_slug: employee.slug,
          checkin_ts: checkinTime.toISOString(),
          checkout_ts: checkoutTime.toISOString(),
          mode: mode,
          mood: ['happy', 'productive', 'focused', 'energetic', 'calm'][Math.floor(Math.random() * 5)],
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

// Run the seed function
seedDummyData()
  .then(() => {
    console.log('\n🎉 Dummy data seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
