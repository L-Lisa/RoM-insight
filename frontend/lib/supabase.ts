import { createClient } from "@supabase/supabase-js";

// Publika värden (skickas till varje besökares webbläsare; RLS ger enbart läsning).
// Env-variabler har företräde; fallbacken gör att bygget aldrig faller på saknad env.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hzypdzhanxoybqevoonj.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6eXBkemhhbnhveWJxZXZvb25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDY0MjQsImV4cCI6MjA4OTE4MjQyNH0.Zw66V3ToRdqOWeWbUqtkGLiEpbtM2rodHy4UV6K3oqk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
