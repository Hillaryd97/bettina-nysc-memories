import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zzseelovitkeyxjnalyw.supabase.co"; // Replace with your URL
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6c2VlbG92aXRrZXl4am5hbHl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDE2MTcsImV4cCI6MjA2MzUxNzYxN30.y5a6XZSXHSIDKVKowxINk9e-1IIWp-eDo1llDk2innw"; // Replace with your anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
