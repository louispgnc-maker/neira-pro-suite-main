-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can join cabinet with valid code" ON public.cabinet_members;
DROP POLICY IF EXISTS "Users can update their own cabinet membership" ON public.cabinet_members;

-- Politique INSERT: permettre de créer un cabinet_member si code valide
CREATE POLICY "Users can join cabinet with valid code"
ON public.cabinet_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- L'utilisateur peut s'insérer s'il existe un cabinet avec un code d'accès valide
  -- et que son email correspond (ou que son user_id correspond)
  EXISTS (
    SELECT 1 FROM public.cabinets c
    WHERE c.id = cabinet_members.cabinet_id
    AND c.code_acces IS NOT NULL
  )
  AND (
    cabinet_members.user_id = auth.uid()
    OR cabinet_members.email = auth.jwt()->>'email'
  )
);

-- Politique UPDATE: permettre de mettre à jour son propre cabinet_member
CREATE POLICY "Users can update their own cabinet membership"
ON public.cabinet_members
FOR UPDATE
TO authenticated
USING (
  -- Peut mettre à jour si c'est son propre user_id OU si l'email correspond et statut pending
  cabinet_members.user_id = auth.uid()
  OR (cabinet_members.email = auth.jwt()->>'email' AND cabinet_members.status = 'pending')
)
WITH CHECK (
  -- Peut mettre à jour son propre user_id OU son email
  cabinet_members.user_id = auth.uid()
  OR cabinet_members.email = auth.jwt()->>'email'
);
