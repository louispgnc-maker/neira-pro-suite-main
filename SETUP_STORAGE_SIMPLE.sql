-- ✅ Script SQL complet pour configurer le Storage
-- À exécuter dans : Supabase Dashboard > SQL Editor > New query

-- 1. Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  false, 
  52428800,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Activer RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "users_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "users_select_own_files" ON storage.objects;
DROP POLICY IF EXISTS "users_update_own_files" ON storage.objects;
DROP POLICY IF EXISTS "users_delete_own_files" ON storage.objects;

-- 4. Créer les 4 politiques
CREATE POLICY "users_insert_own_folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users_select_own_files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users_update_own_files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users_delete_own_files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ✅ Terminé ! Testez maintenant le bouton PDF dans votre app
