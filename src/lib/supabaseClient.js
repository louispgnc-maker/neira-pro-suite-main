
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjMzMTQsImV4cCI6MjA3NzczOTMxNH0.ItqpqcgP_FFqvmx-FunQv0RmCI9EATJlUWuYmw0zPvA'
export const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error("Erreur:", error)
  } else {
    console.log("Utilisateur connecté :", user)
  }
}

checkUser()