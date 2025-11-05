
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjMzMTQsImV4cCI6MjA3NzczOTMxNH0.ItqpqcgP_FFqvmx-FunQv0RmCI9EATJlUWuYmw0zPvA'

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