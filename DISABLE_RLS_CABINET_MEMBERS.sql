-- Désactiver complètement RLS sur cabinet_members
-- Cela permet à tous les utilisateurs authentifiés de lire/écrire leurs cabinet_members

ALTER TABLE public.cabinet_members DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Members can read their own membership" ON public.cabinet_members;
DROP POLICY IF EXISTS "Users can join cabinet with valid code" ON public.cabinet_members;
DROP POLICY IF EXISTS "Users can update their own cabinet membership" ON public.cabinet_members;
