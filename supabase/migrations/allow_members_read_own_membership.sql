-- Permettre aux membres de lire leur propre ligne dans cabinet_members
-- Nécessaire pour que get_user_cabinets() fonctionne

CREATE POLICY "Members can read their own membership"
ON public.cabinet_members
FOR SELECT
TO authenticated
USING (
  -- Peut lire si c'est son propre user_id
  user_id = auth.uid()
  OR
  -- OU si l'email correspond et c'est pending (pour la vérification avant signup)
  (email = auth.jwt()->>'email' AND status = 'pending')
);
