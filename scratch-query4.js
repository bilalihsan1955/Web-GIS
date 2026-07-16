require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const invalidUUIDs = ['', 'null', 'undefined', 'all'];

  for (const invalid of invalidUUIDs) {
    let query = supabase.from('company_sections').select('*').order('created_at', { ascending: true });
    query = query.eq('created_by', invalid);

    const { data, error } = await query;
    console.log(`Testing with adminId: "${invalid}" -> Error:`, JSON.stringify(error));
  }
}

test();
