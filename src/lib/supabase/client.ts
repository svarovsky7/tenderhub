import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get environment variables with validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('Supabase Key:', supabaseAnonKey ? 'Set' : 'Missing');

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

// Create Supabase client with optimized configuration for session persistence
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Use PKCE flow for better security
    storageKey: 'sb-auth-token', // Explicit storage key for better persistence
    storage: window.localStorage, // Explicit localStorage usage
    debug: import.meta.env.DEV, // Enable debug logs in development
    // Note: refreshThreshold and retryAttempts are not available in current Supabase version
    // but session persistence is improved through other settings above
  },
  global: {
    headers: {
      'X-Client-Info': 'tenderhub@1.0.0',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Export types for easier imports
export type { Database } from './types';
export type { User, Session } from '@supabase/supabase-js';

// Helper to get typed supabase client
export const getSupabaseClient = () => supabase;

// Helper to check if client is properly configured
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};