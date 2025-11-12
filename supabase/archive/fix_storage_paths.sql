-- Safe fixes for storage path fields
-- 1) Remove leading slashes from paths stored in documents.storage_path and cabinet_documents.file_url
-- 2) Trim surrounding whitespace
-- Run this file in Supabase SQL Editor for the target project.

BEGIN;

-- Trim leading slashes and whitespace in documents.storage_path
UPDATE public.documents
SET storage_path = regexp_replace(trim(storage_path), '^/+', '')
WHERE storage_path IS NOT NULL AND storage_path <> '';

-- Trim leading slashes and whitespace in cabinet_documents.file_url
UPDATE public.cabinet_documents
SET file_url = regexp_replace(trim(file_url), '^/+', '')
WHERE file_url IS NOT NULL AND file_url <> '';

COMMIT;

-- Notes:
--  - This is a low-risk migration: it only modifies DB text fields.
--  - It does NOT rename any objects in Supabase Storage. If you want to rename objects
--    on the storage bucket (to remove spaces or special characters), do that in Storage
--    Studio or with a script, then update the DB accordingly.
--  - After running this, the client should call createSignedUrl with the exact storage_path
--    value stored in public.documents (no manual encoding). The SDK will encode when needed.
