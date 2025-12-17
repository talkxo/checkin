// Test script to verify API output accuracy for Rishi Raj
// Run with: node test-rishi-api.js

const testDate = '2024-12-08'; // December 8th (Monday)
const testSlug = 'rishi-raj'; // Likely slug format

console.log('=== Testing API Output Accuracy for Rishi Raj ===\n');

// Test 1: Employee lookup
async function testEmployeeLookup() {
  console.log('Test 1: Employee Lookup');
  console.log('------------------------');
  
  try {
    const response = await fetch(`http://localhost:3000/api/employees?q=Rishi`);
    const data = await response.json();
    
    console.log('Search results for "Rishi":');
    console.log(JSON.stringify(data, null, 2));
    
    const rishi = data.find(emp => emp.full_name === 'Rishi Raj' || emp.full_name.includes('Rishi'));
    if (rishi) {
      console.log(`\n✓ Found: ${rishi.full_name} (slug: ${rishi.slug})`);
      return rishi.slug;
    } else {
      console.log('\n✗ Rishi Raj not found in search results');
      return testSlug; // Fallback to expected slug
    }
  } catch (error) {
    console.log('✗ Error:', error.message);
    console.log('  (Server may not be running - using expected slug)');
    return testSlug;
  }
}

// Test 2: Attendance History for specific date
async function testAttendanceHistory(slug) {
  console.log('\n\nTest 2: Attendance History API');
  console.log('--------------------------------');
  console.log(`Date: ${testDate} (Expected: Monday, December 8, 2024)`);
  console.log(`Slug: ${slug}\n`);
  
  try {
    const response = await fetch(`http://localhost:3000/api/attendance/history?slug=${slug}&date=${testDate}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✓ API Response:');
      console.log(JSON.stringify(data, null, 2));
      
      // Verify date accuracy
      console.log('\n--- Date Accuracy Check ---');
      const dateObj = new Date(testDate);
      const expectedDay = dateObj.toLocaleDateString('en-US', { 
        weekday: 'long',
        timeZone: 'Asia/Kolkata'
      });
      const expectedDate = dateObj.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
      
      console.log(`Expected Day: ${expectedDay}`);
      console.log(`Expected Date: ${expectedDate}`);
      console.log(`\nCheck-in Time: ${data.checkinTime || 'N/A'}`);
      console.log(`Check-out Time: ${data.checkoutTime || 'N/A'}`);
      console.log(`Total Hours: ${data.totalHours || 'N/A'}`);
      console.log(`Status: ${data.status || 'N/A'}`);
      console.log(`Mode: ${data.mode || 'N/A'}`);
      
      return true;
    } else {
      console.log('✗ API Error:', data.error);
      return false;
    }
  } catch (error) {
    console.log('✗ Error:', error.message);
    return false;
  }
}

// Test 3: Date formatting consistency
async function testDateFormatting(slug) {
  console.log('\n\nTest 3: Date Formatting Consistency');
  console.log('-----------------------------------');
  
  const testDates = [
    '2024-12-08', // December 8 (Monday)
    '2024-12-09', // December 9 (Tuesday)
    '2024-12-10', // December 10 (Wednesday)
  ];
  
  console.log('Testing multiple dates to verify calendar alignment:\n');
  
  for (const date of testDates) {
    try {
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString('en-US', { 
        weekday: 'long',
        timeZone: 'Asia/Kolkata'
      });
      const formattedDate = dateObj.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
      
      const response = await fetch(`http://localhost:3000/api/attendance/history?slug=${slug}&date=${date}`);
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✓ ${date} (${dayName}, ${formattedDate}):`);
        console.log(`  Status: ${data.status}, Hours: ${data.totalHours || 'N/A'}`);
      } else {
        console.log(`✗ ${date} (${dayName}, ${formattedDate}): Error - ${data.error}`);
      }
    } catch (error) {
      console.log(`✗ ${date}: ${error.message}`);
    }
  }
}

// Main test execution
async function runTests() {
  const slug = await testEmployeeLookup();
  await testAttendanceHistory(slug);
  await testDateFormatting(slug);
  
  console.log('\n\n=== Test Summary ===');
  console.log('1. Verify employee lookup returns correct slug');
  console.log('2. Verify attendance history API returns correct data for December 8');
  console.log('3. Verify dates align correctly with calendar (Monday = Dec 8, Tuesday = Dec 9)');
  console.log('\nNote: If server is not running, start it with: npm run dev');
}

// Run tests
runTests().catch(console.error);



