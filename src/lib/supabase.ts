import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing Supabase URL. Please add VITE_SUPABASE_URL to your environment variables.');
}

if (!supabaseKey) {
  throw new Error('Missing Supabase Anon Key. Please add VITE_SUPABASE_ANON_KEY to your environment variables.');
}

// console.log('Supabase config:', {
//   url: supabaseUrl,
//   keyLength: supabaseKey?.length || 0
// });

export const supabase = createClient(supabaseUrl, supabaseKey);