// Supabase client for the Eltuff backend.
// The Eltuff tables live in the dedicated "eltuff" schema of the shared
// Supabase project, so the client is pinned to that schema.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://nmwfevhetlwehbuikflk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td2ZldmhldGx3ZWhidWlrZmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMjM2NDgsImV4cCI6MjA3MjU5OTY0OH0.q3J5u0kWpQkXTJ9mnjIA670TvHKz59O5FsSYyEbkMwo";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database, "eltuff">(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  db: {
    schema: "eltuff",
  },
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
