
import { createClient } from '@supabase/supabase-js'

// Use Vite environment variables instead of hardcoding credentials.
// Define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local
const supabaseUrl = import.meta?.env?.VITE_SUPABASE_URL
const supabaseKey = import.meta?.env?.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  // Fail fast to avoid silent runtime issues if env vars are missing
  // eslint-disable-next-line no-console
  console.error('[supabaseClient] Missing Supabase env vars. Did you create .env.local?')
  throw new Error('Supabase configuration missing: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
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

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: fetchWithTimeout(7000) },
  auth: { persistSession: true, detectSessionInUrl: true },
})