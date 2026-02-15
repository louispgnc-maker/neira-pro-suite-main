-- Désactiver RLS sur TOUTES les tables liées au cabinet

ALTER TABLE cabinets DISABLE ROW LEVEL SECURITY;
ALTER TABLE cabinet_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE cabinet_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE cabinet_contrats DISABLE ROW LEVEL SECURITY;
ALTER TABLE cabinet_dossiers DISABLE ROW LEVEL SECURITY;
ALTER TABLE cabinet_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Vérifier
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename LIKE 'cabinet%' OR tablename = 'profiles';
