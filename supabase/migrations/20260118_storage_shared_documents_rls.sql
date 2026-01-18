-- Migration: RLS policies pour le bucket storage shared-documents
-- Description: Permet aux clients ET aux professionnels d'uploader des documents

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Professionals can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Clients can upload their documents" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can read client documents" ON storage.objects;
DROP POLICY IF EXISTS "Clients can read their documents" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can delete client documents" ON storage.objects;
DROP POLICY IF EXISTS "Clients can delete their documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to shared-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read from shared-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from shared-documents" ON storage.objects;

-- INSERT (upload): Les professionnels peuvent uploader pour leurs clients, les clients pour eux-mêmes
CREATE POLICY "Professionals and clients can upload to shared-documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'shared-documents'
    AND (
      -- Format du path: cabinetId/clientId/filename
      -- Le professionnel peut uploader pour ses clients
      (storage.foldername(name))[1] IN (
        SELECT c.owner_id::text
        FROM clients c
        INNER JOIN cabinet_members cm ON cm.cabinet_id = c.owner_id
        WHERE cm.user_id = auth.uid()
          AND cm.status = 'active'
      )
      OR
      -- Le client peut uploader dans son dossier
      (storage.foldername(name))[2] IN (
        SELECT c.id::text
        FROM clients c
        WHERE c.user_id = auth.uid()
      )
    )
  );

-- SELECT (download): Les professionnels peuvent lire les docs de leurs clients, les clients peuvent lire leurs docs
CREATE POLICY "Professionals and clients can read from shared-documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'shared-documents'
    AND (
      -- Le professionnel peut lire les documents de ses clients
      (storage.foldername(name))[1] IN (
        SELECT c.owner_id::text
        FROM clients c
        INNER JOIN cabinet_members cm ON cm.cabinet_id = c.owner_id
        WHERE cm.user_id = auth.uid()
          AND cm.status = 'active'
      )
      OR
      -- Le client peut lire ses propres documents
      (storage.foldername(name))[2] IN (
        SELECT c.id::text
        FROM clients c
        WHERE c.user_id = auth.uid()
      )
    )
  );

-- DELETE: Les professionnels peuvent supprimer les docs de leurs clients, les clients peuvent supprimer leurs docs
CREATE POLICY "Professionals and clients can delete from shared-documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'shared-documents'
    AND (
      -- Le professionnel peut supprimer les documents de ses clients
      (storage.foldername(name))[1] IN (
        SELECT c.owner_id::text
        FROM clients c
        INNER JOIN cabinet_members cm ON cm.cabinet_id = c.owner_id
        WHERE cm.user_id = auth.uid()
          AND cm.status = 'active'
      )
      OR
      -- Le client peut supprimer ses propres documents
      (storage.foldername(name))[2] IN (
        SELECT c.id::text
        FROM clients c
        WHERE c.user_id = auth.uid()
      )
    )
  );

-- UPDATE: Similaire pour la modification des métadonnées
CREATE POLICY "Professionals and clients can update in shared-documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'shared-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT c.owner_id::text
        FROM clients c
        INNER JOIN cabinet_members cm ON cm.cabinet_id = c.owner_id
        WHERE cm.user_id = auth.uid()
          AND cm.status = 'active'
      )
      OR
      (storage.foldername(name))[2] IN (
        SELECT c.id::text
        FROM clients c
        WHERE c.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    bucket_id = 'shared-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT c.owner_id::text
        FROM clients c
        INNER JOIN cabinet_members cm ON cm.cabinet_id = c.owner_id
        WHERE cm.user_id = auth.uid()
          AND cm.status = 'active'
      )
      OR
      (storage.foldername(name))[2] IN (
        SELECT c.id::text
        FROM clients c
        WHERE c.user_id = auth.uid()
      )
    )
  );
