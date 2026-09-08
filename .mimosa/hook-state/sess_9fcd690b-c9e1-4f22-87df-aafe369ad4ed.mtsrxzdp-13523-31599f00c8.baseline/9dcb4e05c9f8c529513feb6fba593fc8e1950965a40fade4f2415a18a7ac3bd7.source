const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = process.argv[2];
  
  if (!password) {
    console.log('Usage: node scripts/generate-password-hash.js <password>');
    console.log('Example: node scripts/generate-password-hash.js myadminpassword');
    process.exit(1);
  }
  
  try {
    const hash = await bcrypt.hash(password, 12);
    console.log('\n🔐 Password Hash Generated:');
    console.log('=====================================');
    console.log('Add this to your .env.local file:');
    console.log('=====================================');
    console.log(`ADMIN_PASSWORD=${hash}`);
    console.log('=====================================');
    console.log('\n⚠️  Keep this password secure!');
    console.log('⚠️  Store the hash, not the plain password');
  } catch (error) {
    console.error('Error generating hash:', error);
    process.exit(1);
  }
}

generateHash();
