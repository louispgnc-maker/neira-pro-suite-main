-- Vérifier les colonnes de la table cabinet_members
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'cabinet_members'
ORDER BY ordinal_position;
