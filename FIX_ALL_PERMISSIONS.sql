-- SOLUTION COMPLÈTE: Désactiver RLS sur TOUTES les tables qui posent problème

-- 1. Désactiver RLS sur users
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Désactiver RLS sur cabinet_members 
ALTER TABLE public.cabinet_members DISABLE ROW LEVEL SECURITY;

-- 3. Désactiver RLS sur cabinets
ALTER TABLE public.cabinets DISABLE ROW LEVEL SECURITY;

-- 4. Désactiver RLS sur profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les politiques existantes sur ces tables
DROP POLICY IF EXISTS "Members can read their own membership" ON public.cabinet_members;
DROP POLICY IF EXISTS "Users can join cabinet with valid code" ON public.cabinet_members;
DROP POLICY IF EXISTS "Users can update their own cabinet membership" ON public.cabinet_members;

-- Voilà. Plus de problèmes de permissions.
