import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Get environment variables with proper fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Non-fatal: allows app to run with mock data paths
  // Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env for Vite
  // Or NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for Next.js
  console.warn('Supabase env vars missing. Set VITE_/NEXT_PUBLIC_ SUPABASE URL and ANON KEY to enable auth/db.')
}

export const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const getSupabaseClient = (): SupabaseClient | null => supabase;