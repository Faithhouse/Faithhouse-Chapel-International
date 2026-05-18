
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bhujaqeledtkmwhoqfcd.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "sb_publishable_CT9Y87U7ZbdTOsKDzWg37g_RqcAHbgv"; 

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkAllTables() {
  console.log('Checking all tables...');
  
  // We can't easily list all tables without a special RPC or querying information_schema
  // But we can try to guess common names or check for tithe_records specifically
  
  const tablesToCheck = [
    'members',
    'tithe_entries',
    'tithe_records',
    'attendance_records',
    'visitation_records',
    'financial_records',
    'ministry_members',
    'volunteers',
    'children',
    'check_in_logs',
    'cell_attendance',
    'visitor_attendance'
  ];

  for (const table of tablesToCheck) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        console.log(`Table [${table}] does NOT exist.`);
      } else {
        console.log(`Table [${table}] exists but error:`, error.message);
      }
    } else {
      console.log(`Table [${table}] exists.`);
    }
  }
}

checkAllTables();
