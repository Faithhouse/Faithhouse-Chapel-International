import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bhujaqeledtkmwhoqfcd.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "sb_publishable_CT9Y87U7ZbdTOsKDzWg37g_RqcAHbgv"; 
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
  // Querying information_schema.tables is only possible with a specialized role or direct DB access
  // But we can try to select from 'profiles' to see if it exists
  const { data, error } = await supabase.from('profiles').select('id').limit(1);
  if (error) {
    console.error('Error selecting from profiles:', error.message);
  } else {
    console.log('Successfully reached profiles table. Rows found:', data.length);
  }

  // Also check auth health
  const res = await fetch(SUPABASE_URL + '/auth/v1/health');
  console.log('Auth Health Status:', res.status);
}

listTables();
