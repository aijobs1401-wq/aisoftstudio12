import { createClient } from '@supabase/supabase-js';

// Next.js exposes browser-safe environment variables through process.env
// only when their names start with NEXT_PUBLIC_.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://jkufkafmkgfshbvfsapr.supabase.co';

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprdWZrYWZta2dmc2hidmZzYXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNzg2MDAsImV4cCI6MjA1NTc1NDYwMH0.mock_key_for_build';

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.',
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
