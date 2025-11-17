-- Migration: Secure shared storage with RLS on storage.objects (OWNER required)
-- Date: 2025-11-13
-- IMPORTANT: The statements in this file must be executed by the project OWNER
-- (the role that owns the storage schema, e.g. `supabase_admin`/`supabase_storage_admin`).
-- A non-owner will get ERROR: permission denied for relation storage.objects (42501).
--
-- Recommended workflow:
-- 1) Review this file.
-- 2) Run it as the project owner (via Supabase dashboard SQL editor) or ask Supabase support to run it.
-- 3) After it's applied, the frontend changes in branch `supabase/secure-shares` will enforce private shared storage.

BEGIN;

-- Enable RLS on storage.objects (owner only)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: cabinet members can SELECT (download/get public url) objects stored under the
-- path prefix `<cabinetId>/...` where the first path segment is a cabinet uuid.
-- The policy below uses split_part(name, '/', 1)::uuid to extract the cabinet id.
-- CREATE POLICY "cabinet_members_read_objects" ON storage.objects
--   FOR SELECT USING (
--     (
--       case when name is null then false
--       else (
--         split_part(name, '/', 1) ~ '^[0-9a-fA-F\-]{36}$' AND (
--           (split_part(name, '/', 1))::uuid IN (
--             select cm.cabinet_id from public.cabinet_members cm
--             where cm.user_id = auth.uid() and cm.status = 'active'
--           )
--         )
--       ) end
--     )
--   );

-- Policy: cabinet members can INSERT/UPLOAD objects into their cabinet prefix
-- (with check ensuring object path begins with their cabinet id). Depending on your
-- storage client behavior you may prefer to allow the storage service role to insert.
-- CREATE POLICY "cabinet_members_insert_objects" ON storage.objects
--   FOR INSERT WITH CHECK (
--     (
--       case when name is null then false
--       else (
--         split_part(name, '/', 1) ~ '^[0-9a-fA-F\-]{36}$' AND (
--           (split_part(name, '/', 1))::uuid IN (
--             select cm.cabinet_id from public.cabinet_members cm
--             where cm.user_id = auth.uid() and cm.status = 'active'
--           )
--         )
--       ) end
--     )
--   );

-- Policy: members can UPDATE/DELETE objects under their cabinet id
-- CREATE POLICY "cabinet_members_modify_objects" ON storage.objects
--   FOR UPDATE, DELETE USING (
--     (
--       case when name is null then false
--       else (
--         split_part(name, '/', 1) ~ '^[0-9a-fA-F\-]{36}$' AND (
--           (split_part(name, '/', 1))::uuid IN (
--             select cm.cabinet_id from public.cabinet_members cm
--             where cm.user_id = auth.uid() and cm.status = 'active'
--           )
--         )
--       ) end
--     )
--   );

-- NOTE: The above policies are commented out to avoid accidental execution by a
-- non-owner. To apply them, uncomment the ALTER TABLE / CREATE POLICY statements
-- and run this migration as the DB owner.

COMMIT;
