-- Script de test pour vérifier la migration des cabinets
-- À exécuter dans Supabase SQL Editor APRÈS avoir appliqué la migration

-- 1) Vérifier que les tables existent
SELECT 'Tables existantes:' as test;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('cabinets', 'cabinet_members')
ORDER BY table_name;

-- 2) Vérifier que les fonctions existent
SELECT 'Fonctions existantes:' as test;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_cabinet_owner',
    'regenerate_cabinet_code',
    'join_cabinet_by_code',
    'create_cabinet',
    'get_user_cabinets',
    'get_cabinet_members',
    'remove_cabinet_member',
    'invite_cabinet_member'
  )
ORDER BY routine_name;

-- 3) Vérifier les policies RLS
SELECT 'Policies RLS:' as test;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('cabinets', 'cabinet_members')
ORDER BY tablename, policyname;

-- 4) Vérifier les index
SELECT 'Index créés:' as test;
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('cabinets', 'cabinet_members')
ORDER BY tablename, indexname;

-- 5) Vérifier la colonne cabinet_id dans profiles
SELECT 'Colonne cabinet_id dans profiles:' as test;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'cabinet_id';

SELECT '✅ Migration vérifiée avec succès!' as resultat;
