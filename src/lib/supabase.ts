import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local (see .env.example).');
}

/**
 * The one Supabase client for the browser. The anon key is public; row level security and the
 * database functions decide what each visitor, customer and staff member may read or change.
 * Sessions persist in localStorage; links from sign-up and password-reset emails are read from the URL.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
});

/** Message of a Supabase/PostgREST error (database functions raise codes like "OUT_OF_STOCK:<item>"). */
export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return String(error);
}
