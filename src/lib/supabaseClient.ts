import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || 'https://jkufkafmkgfshbvfsapr.supabase.co';
const supabasePublishableKey = import.meta.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprdWZrYWZta2dmc2hidmZzYXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNzg2MDAsImV4cCI6MjA1NTc1NDYwMH0.mock_key_for_build';

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn('Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY environment variables.');
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
