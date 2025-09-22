import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://iybyomrsavqahxmldjux.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5YnlvbXJzYXZxYWh4bWxkanV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ1MDksImV4cCI6MjA3Mzc3MDUwOX0.lBA7qlmkfekEJ3wzOfXEwEPj_quAQcjYeCbHW92UWaU"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)