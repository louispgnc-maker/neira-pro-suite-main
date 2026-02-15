-- Créer une table users vide pour éviter les erreurs
-- (certaines fonctions anciennes y font peut-être référence)

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Désactiver RLS sur cette table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
