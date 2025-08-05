import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get environment variables with validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

// Create Supabase client with basic configuration
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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

// Helper to get typed supabase client
export const getSupabaseClient = () => supabase;

// Helper to check if client is properly configured
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};