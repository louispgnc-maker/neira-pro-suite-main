-- TEMPORAIRE: Désactiver RLS sur cabinet_members pour tester
ALTER TABLE public.cabinet_members DISABLE ROW LEVEL SECURITY;

-- Note: Ceci est temporaire pour déboguer. 
-- Une fois que ça fonctionne, on réactivera RLS avec les bonnes politiques.
