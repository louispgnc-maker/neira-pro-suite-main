-- Réactiver RLS et créer les politiques complètes pour cabinet_members

-- 1. Réactiver RLS
ALTER TABLE public.cabinet_members ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer toutes les anciennes politiques
DROP POLICY IF EXISTS "Members can read their own membership" ON public.cabinet_members;
DROP POLICY IF EXISTS "Users can join cabinet with valid code" ON public.cabinet_members;
DROP POLICY IF EXISTS "Users can update their own cabinet membership" ON public.cabinet_members;

-- 3. Créer les nouvelles politiques complètes

-- SELECT: Lire son propre membership
CREATE POLICY "Members can read their own membership"
ON public.cabinet_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (email = auth.jwt()->>'email' AND status = 'pending')
);

-- INSERT: Rejoindre un cabinet (avec ou sans code)
CREATE POLICY "Users can join cabinet with valid code"
ON public.cabinet_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Peut insérer si c'est son propre user_id
  user_id = auth.uid()
  OR 
  -- OU si l'email correspond (pour les invitations pending)
  email = auth.jwt()->>'email'
);

-- UPDATE: Mettre à jour son membership (de pending à active)
CREATE POLICY "Users can update their own cabinet membership"
ON public.cabinet_members
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR (email = auth.jwt()->>'email' AND status = 'pending')
)
WITH CHECK (
  user_id = auth.uid()
  OR email = auth.jwt()->>'email'
);
