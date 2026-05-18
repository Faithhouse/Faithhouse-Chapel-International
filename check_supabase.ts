
import fetch from 'node-fetch';

const SUPABASE_URL = "https://bhujaqeledtkmwhoqfcd.supabase.co";

async function check() {
  try {
    const res = await fetch(SUPABASE_URL + '/auth/v1/health');
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body:', text);
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

check();
