import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bhujaqeledtkmwhoqfcd.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "sb_publishable_CT9Y87U7ZbdTOsKDzWg37g_RqcAHbgv"; 
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkAttendanceData() {
  const { data: members, error: mError } = await supabase.from('members').select('id, first_name, last_name, status');
  if (mError) {
    console.error('Error fetching members:', mError.message);
    return;
  }

  const { data: events, error: eError } = await supabase.from('attendance_events').select('*').order('event_date', { ascending: false }).limit(10);
  if (eError) {
    console.error('Error fetching events:', eError.message);
    return;
  }

  console.log(`Found ${members.length} members and ${events.length} recent events.`);

  for (const member of members) {
     const { data: records, error: rError } = await supabase
        .from('attendance_records')
        .select('*, attendance_events(event_date)')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false });
     
     if (rError) continue;

     console.log(`Member: ${member.first_name} ${member.last_name}, Current Status: ${member.status}`);
     console.log(`Attendance Records: ${records.length}`);
     records.slice(0, 5).forEach(r => {
        console.log(`  - Date: ${(r.attendance_events as any)?.event_date}, Status: ${r.status}`);
     });
  }
}

checkAttendanceData();
