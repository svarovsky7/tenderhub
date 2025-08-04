import { createClient } from '@supabase/supabase-js'

const supabaseUrl: string = import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey: string = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

