const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
  console.log('Fetching settings...');
  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('*');

  if (settingsError) {
    console.error('Error fetching settings:', settingsError);
  } else {
    console.log('\n--- SETTINGS ---');
    console.log(JSON.stringify(settings, null, 2));
  }
}

inspect();
