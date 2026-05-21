
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
// Fallback for LockManager in restricted environments (like iframes without permissions)
if (typeof window !== 'undefined' && (!navigator.locks || typeof navigator.locks.request !== 'function')) {
  console.warn('Navigator LockManager is restricted or unavailable. Applying fallback.');
  const lockFallback = {
    request: async (_name: string, _options: any, callback: any) => {
      const fn = typeof _options === 'function' ? _options : callback;
      if (typeof fn === 'function') return await fn();
    },
    query: async () => ({ finished: [], held: [], pending: [] })
  };
  
  try {
    if (!navigator.locks) {
      // @ts-ignore
      Object.defineProperty(navigator, 'locks', { value: lockFallback, writable: true, configurable: true });
    } else {
      // @ts-ignore
      Object.defineProperty(navigator.locks, 'request', { value: lockFallback.request, writable: true, configurable: true });
    }
  } catch (e) {
    console.error('Failed to polyfill navigator.locks:', e);
  }
}


// Create and export the project-wide Supabase client
const customFetch = async (url: string, options: any) => {
  const checkAndNotifyJwtExpired = async (res: Response) => {
    try {
      const body = await res.clone().text();
      if (body && (body.includes("JWT expired") || body.includes("PGRST303") || body.includes("token is expired") || res.status === 401)) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('supabase-jwt-expired'));
        }
      }
    } catch (e) {
      // ignore parsing errors
    }
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const body = await response.clone().text();
      console.warn(`Supabase Request Failed: [${response.status}] ${url}`, body);
      await checkAndNotifyJwtExpired(response);
    }
    return response;
  } catch (error: any) {
    // If direct fetch fails (NetworkError / Failed to fetch), try via backend proxy
    const isNetworkError = error.message === 'Failed to fetch' || 
                         error.message?.includes('fetch') ||
                         error.message?.includes('NetworkError');
                         
    if (isNetworkError && typeof window !== 'undefined') {
      console.warn(`Direct fetch to Supabase failed. Attempting via backend proxy...`, url);
      try {
        // Extract the path from the Supabase URL
        // e.g. https://xyz.supabase.co/rest/v1/profiles -> rest/v1/profiles
        const urlObj = new URL(url);
        const proxyUrl = `/api/supabase-proxy${urlObj.pathname}${urlObj.search}`;
        
        const proxyResponse = await fetch(proxyUrl, options);
        if (!proxyResponse.ok) {
          await checkAndNotifyJwtExpired(proxyResponse);
        }
        return proxyResponse;
      } catch (proxyError: any) {
        console.error(`Supabase Proxy Fetch Error: ${proxyError.message} for URL: ${url}`);
        throw proxyError;
      }
    }

    console.error(`Supabase Fetch Error: ${error.message} for URL: ${url}`);
    throw error;
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  global: {
    fetch: customFetch
  },
  auth: {

    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // Explicitly provide a lock function to bypass potential issues and provide compatibility
    lock: async (_name: string, _timeout: number, fn: () => Promise<any>) => {
      return await fn();
    }
  }
});



// Dynamic reachability check with better diagnostics
export let isUnreachable = false;
if (typeof window !== 'undefined') {
  // Try a simple ping
  fetch(SUPABASE_URL + '/auth/v1/health', { method: 'GET', mode: 'cors' })
    .then(r => {
      if (!r.ok && r.status !== 401) {
        console.warn('Supabase health check returned non-OK status:', r.status);
        isUnreachable = true;
      }
    })
    .catch(e => {
      isUnreachable = true;
      console.warn('Supabase project URL is unreachable from this browser. This usually indicates a network block, DNS issue, or the project being paused/deleted.', SUPABASE_URL);
      // Detailed error for developers
      console.error('Fetch error details:', e);
    });
}


