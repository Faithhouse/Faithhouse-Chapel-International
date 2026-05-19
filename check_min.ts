import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bhujaqeledtkmwhoqfcd.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "sb_publishable_CT9Y87U7ZbdTOsKDzWg37g_RqcAHbgv"; 
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.from('ministries').select('id, name');
  console.log(data);
}

check();
