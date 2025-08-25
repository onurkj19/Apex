import { createClient } from '@supabase/supabase-js';

// Prefer env vars; fall back to known public values to avoid blank pages in static hosting
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://frxyrrqkdedluvnipige.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyeHlycnFrZGVkbHV2bmlwaWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDU4ODgsImV4cCI6MjA3MTcyMTg4OH0.vSG18_r87VbcvVWoL2WypOxZ-J088s6ZM9N-qTrd7OM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;


