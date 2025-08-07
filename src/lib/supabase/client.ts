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

// Create Supabase client with enhanced configuration for reliability
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'X-Client-Info': 'tenderhub@1.0.0',
    },
    fetch: async (url: RequestInfo | URL, options: RequestInit = {}) => {
      console.log('🌐 Supabase fetch request:', { url: url.toString(), method: options.method });
      
      const maxRetries = 3;
      const baseDelay = 1000; // 1 second
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`📡 Attempt ${attempt}/${maxRetries} for ${url}`);
          
          // Preserve all original headers, especially the apikey
          const enhancedOptions = {
            ...options,
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'X-Client-Info': 'tenderhub@1.0.0',
              ...options.headers, // Original headers take precedence
            },
          };
          
          console.log('📋 Request headers:', Object.keys(enhancedOptions.headers));
          
          const response = await fetch(url, enhancedOptions);
          
          console.log(`📦 Response status: ${response.status}`, { 
            ok: response.ok, 
            statusText: response.statusText,
            url: response.url
          });
          
          if (response.ok) {
            console.log('✅ Request successful on attempt', attempt);
            return response;
          }
          
          // If it's a client error (4xx), don't retry
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            console.warn('❌ Client error, not retrying:', response.status);
            return response;
          }
          
          // For server errors (5xx) or rate limiting (429), retry
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
            console.warn(`⏳ Server error ${response.status}, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          console.error('❌ Max retries reached, returning failed response');
          return response;
          
        } catch (error) {
          console.error(`💥 Network error on attempt ${attempt}:`, error);
          
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.warn(`⏳ Retrying in ${delay}ms due to network error...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          console.error('❌ Max retries reached, throwing error');
          throw error;
        }
      }
      
      throw new Error('Unexpected retry loop exit');
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