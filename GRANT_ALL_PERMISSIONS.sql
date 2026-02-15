-- Donner TOUTES les permissions sur la table users
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO service_role;

-- Pareil pour les autres tables
GRANT ALL ON public.cabinet_members TO authenticated;
GRANT ALL ON public.cabinet_members TO anon;
GRANT ALL ON public.cabinet_members TO service_role;

GRANT ALL ON public.cabinets TO authenticated;
GRANT ALL ON public.cabinets TO anon;
GRANT ALL ON public.cabinets TO service_role;

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
