
import { createClient } from '@supabase/supabase-js'

// Prefer Vite env variables; if absent, fallback to known public anon credentials to keep prod online.
// Note: Supabase anon keys are public by design and safe to embed on the client.
let supabaseUrl = import.meta?.env?.VITE_SUPABASE_URL
let supabaseKey = import.meta?.env?.VITE_SUPABASE_ANON_KEY

console.log('[supabaseClient] Loaded env vars:', {
  url: supabaseUrl,
  keyLength: supabaseKey?.length,
  hasKey: !!supabaseKey
});

if (!supabaseUrl || !supabaseKey) {
  // Fallback to previous public values so the online site keeps working even if env vars are missing.
  // You can override these at build time with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
  // fallback to the project's REST API URL (project ref -> <ref>.supabase.co)
  supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co'
  supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjMzMTQsImV4cCI6MjA3NzczOTMxNH0.ItqpqcgP_FFqvmx-FunQv0RmCI9EATJlUWuYmw0zPvA'
   
  console.warn('[supabaseClient] Using fallback Supabase credentials. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for environment-specific builds.')
}

// Fetch avec timeout pour éviter les attentes interminables en cas de réseau lent
const fetchWithTimeout = (timeoutMs = 7000) => {
  return async (input, init = {}) => {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const resp = await fetch(input, { ...init, signal: controller.signal })
      return resp
    } finally {
      clearTimeout(id)
    }
  }
}

// Use localStorage for auth storage so sessions persist across tabs and page refreshes.
// This allows staying logged in even after closing and reopening the browser.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: fetchWithTimeout(7000) },
  auth: { 
    persistSession: true, 
    detectSessionInUrl: true, 
    storage: localStorage,
    autoRefreshToken: true,
    storageKey: 'neira-auth-token'
  },
})