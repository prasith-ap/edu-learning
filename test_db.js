const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const configMatch = fs.readFileSync('js/config.js', 'utf8').match(/SUPABASE_URL:\s*'([^']+)',\s*SUPABASE_ANON_KEY:\s*'([^']+)'/);
const client = createClient(configMatch[1], configMatch[2]);
async function test() {
  const { data: { user }, error: authErr } = await client.auth.signInWithPassword({email: 'test@example.com', password: 'password123'}); // or just insert? no we need user context or check table schema
  // Let's just do a select limit 1 to see the columns
  const { data, error } = await client.from('quiz_history').select('*').limit(1);
  console.log('Data:', data);
  console.log('Error:', error);
}
test();
