import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get environment variables using Vite's import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!supabaseAnonKey) {
  throw new Error('SUPABASE_ANON_KEY environment variable is required');
}

/**
 * Client-side Supabase client (uses anon key)
 * Use this for client-side operations
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
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
export const supabaseAdmin: SupabaseClient = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
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
  return isServerSide && supabaseServiceRoleKey ? supabaseAdmin : supabase;
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
