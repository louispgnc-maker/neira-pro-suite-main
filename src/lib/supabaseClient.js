import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error("Erreur:", error)
  } else {
    console.log("Utilisateur connecté :", user)
  }
}

checkUser()