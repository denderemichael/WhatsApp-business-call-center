import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Helper to get environment variables - works in both Vite (import.meta.env) and Node.js (process.env)
function getEnv(key: string, fallback?: string): string | undefined {
  // @ts-ignore - import.meta.env is only available in Vite
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env[key] || process.env[key] || fallback;
  }
  // Node.js / Vercel serverless environment
  return process.env[key] || fallback;
}

// Get environment variables - supports both VITE_ prefix (Vite) and plain names (Node.js)
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');
const supabaseServiceRoleKey = getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY');

// Type assertion for environment variables
const SUPABASE_URL = supabaseUrl as string;
const SUPABASE_ANON_KEY = supabaseAnonKey as string;
const SUPABASE_SERVICE_ROLE_KEY = supabaseServiceRoleKey as string;

// Validate required environment variables
if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY environment variable is required');
}

/**
 * Client-side Supabase client (uses anon key)
 * Use this for client-side operations
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Server-side Supabase admin client (uses service role key)
 * Use this for server-side operations that need elevated privileges
 * WARNING: The service role key bypasses RLS - use with caution!
 */
export const supabaseAdmin: SupabaseClient = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : supabase;

/**
 * Helper function to get the appropriate Supabase client based on context
 * @param isServerSide - Whether to use the admin (service role) client
 */
export function getSupabaseClient(isServerSide: boolean = false): SupabaseClient {
  return isServerSide && SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : supabase;
}

/**
 * Type for role-based access control
 */
export type UserRole = 'admin' | 'manager' | 'branch_manager' | 'agent';

/**
 * Interface for user metadata stored in Supabase auth
 */
export interface UserMetadata {
  role?: UserRole;
  branch_id?: string;
  name?: string;
}
