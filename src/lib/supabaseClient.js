
import { createClient } from '@supabase/supabase-js'

// Prefer Vite env variables; if absent, fallback to known public anon credentials to keep prod online.
// Note: Supabase anon keys are public by design and safe to embed on the client.
let supabaseUrl = import.meta?.env?.VITE_SUPABASE_URL
let supabaseKey = import.meta?.env?.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  // Fallback to previous public values so the online site keeps working even if env vars are missing.
  // You can override these at build time with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
  // fallback to the project's REST API URL (project ref -> <ref>.supabase.co)
  supabaseUrl = 'https://elysrdqulbvnfilvh.supabase.co'
  supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1bGJ2bmZpbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1OTQ1NTUsImV4cCI6MjA0NzE3MDU1NX0.e8LaQXKc-ou03-FPzW0D1nL1pEsnl5sFD9D0j3z8VGo'
   
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

// Use sessionStorage for auth storage so each browser tab/window can keep an independent session.
// This allows signing into different accounts in two tabs at once. Tradeoffs:
// - sessions are not persisted across tabs or after closing the tab (sessionStorage lifespan)
// - cross-tab sign-out/session sync won't work (localStorage-based sync disabled)
// If you prefer the old behavior (single session across all tabs), change `storage` to localStorage or remove it.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: fetchWithTimeout(7000) },
  auth: { persistSession: true, detectSessionInUrl: true, storage: sessionStorage },
})