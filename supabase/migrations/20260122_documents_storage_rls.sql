-- Migration: RLS policies for 'documents' storage bucket
-- Description: Allow authenticated users to manage objects in the 'documents' bucket
--              only for paths that start with their user id (personal space).

-- Remove any previous policies that may conflict
DROP POLICY IF EXISTS "Users can upload to documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read from documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete from documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents" ON storage.objects;

-- INSERT (upload): allow a user to insert objects into 'documents' when the
-- first path segment equals their `auth.uid()` (e.g. `userId/....`)
CREATE POLICY "Users can upload to documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()
    )
  );

-- SELECT (download / list): allow the owner to read their objects
CREATE POLICY "Users can read from documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()
    )
  );

-- DELETE: only the owner may delete their files
CREATE POLICY "Users can delete from documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()
      OR owner = auth.uid()
    )
  );

-- UPDATE: allow owner to update metadata for their files
CREATE POLICY "Users can update documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()
      OR owner = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()
      OR owner = auth.uid()
    )
  );

-- Note: This migration assumes the 'documents' bucket exists. If your storage
-- layout differs (prefixes, different bucket name), adapt the conditions.
