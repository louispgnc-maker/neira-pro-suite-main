-- Voir toutes les politiques actuelles sur cabinet_members
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'cabinet_members'
ORDER BY policyname;
