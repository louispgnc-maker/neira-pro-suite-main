-- Permettre aux utilisateurs de créer leur propre profil
-- Cette politique autorise l'insertion dans profiles uniquement si l'ID correspond à l'utilisateur authentifié

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
