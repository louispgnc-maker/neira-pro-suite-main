-- Vérifier les permissions actuelles

-- 1. Vérifier RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('cabinet_members', 'users', 'cabinets', 'profiles');

-- 2. Vérifier les GRANT
SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('cabinet_members', 'users', 'cabinets', 'profiles')
AND grantee IN ('authenticated', 'anon', 'service_role');

-- 3. Vérifier les policies (si RLS activé)
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('cabinet_members', 'users', 'cabinets', 'profiles');
