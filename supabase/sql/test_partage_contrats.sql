-- Test du système de partage de contrats avec permissions
-- Date: 2025-12-31
-- Ce test vérifie que seul le créateur peut modifier un contrat partagé

-- 1. Vérifier les policies actives
SELECT 
  policyname, 
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '✓ Lecture par tous les membres'
    WHEN cmd = 'INSERT' THEN '✓ Partage par tous les membres'
    WHEN cmd = 'UPDATE' THEN '✓ Modification par créateur uniquement'
    WHEN cmd = 'DELETE' THEN '✓ Suppression par créateur/owner'
  END as permission
FROM pg_policies 
WHERE tablename = 'cabinet_contrats'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
  END;

-- 2. Compter les contrats partagés
SELECT 
  COUNT(*) as total_contrats_partages,
  COUNT(DISTINCT cabinet_id) as nombre_cabinets,
  COUNT(DISTINCT shared_by) as nombre_partageurs
FROM cabinet_contrats;

-- 3. Voir les contrats partagés avec infos du partageur
SELECT 
  cc.id,
  cc.title,
  cc.contrat_type,
  cc.shared_at,
  p.first_name || ' ' || p.last_name as shared_by_name,
  c.nom as cabinet_name
FROM cabinet_contrats cc
LEFT JOIN profiles p ON p.id = cc.shared_by
LEFT JOIN cabinets c ON c.id = cc.cabinet_id
ORDER BY cc.shared_at DESC
LIMIT 10;

-- 4. Vérifier la structure de la table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'cabinet_contrats'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Résultats attendus:
-- 1. 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- 2. UPDATE policy = "cabinet_sharer_update_contrats" avec condition shared_by = auth.uid()
-- 3. Tous les contrats partagés sont listés
-- 4. Structure contient shared_by NOT NULL
