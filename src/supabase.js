import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (url && key)
  ? createClient(url, key, {
      auth: {
        autoRefreshToken:   true,
        persistSession:     true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Module-level token cache — updated whenever Supabase issues or refreshes a token.
// Allows api.js to build auth headers synchronously without calling getSession()
// on every request (which can block on a network round-trip if the token is stale).
let _cachedToken = null;

if (supabase) {
  // Seed the cache from any existing persisted session on startup
  supabase.auth.getSession().then(({ data: { session } }) => {
    _cachedToken = session?.access_token ?? null;
  });

  // Keep the cache fresh for the lifetime of the page
  supabase.auth.onAuthStateChange((_event, session) => {
    _cachedToken = session?.access_token ?? null;
  });
}

export function getCachedToken() {
  return _cachedToken;
}
