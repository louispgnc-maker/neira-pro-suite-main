-- Solution: donner permissions sur auth.users au lieu de public.users

-- 1. Donner les permissions SELECT sur auth.users (lecture seule pour sécurité)
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.users TO anon;

-- 2. Alternative: supprimer la foreign key si elle existe
-- (décommenter si besoin)
-- ALTER TABLE cabinet_members DROP CONSTRAINT IF EXISTS cabinet_members_user_id_fkey;

-- 3. Vérifier les permissions
SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'auth' AND table_name = 'users';
