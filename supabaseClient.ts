
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Configuration
 * 
 * Replace the values below with your actual project URL and Anon/Public Key 
 * from your Supabase Dashboard (Settings -> API).
 */

const SUPABASE_URL = "https://bhujaqeledtkmwhoqfcd.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_CT9Y87U7ZbdTOsKDzWg37g_RqcAHbgv";

if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY || SUPABASE_URL.includes("your-project")) {
  console.error("Supabase credentials are not properly configured.");
}

// Create and export the project-wide Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
