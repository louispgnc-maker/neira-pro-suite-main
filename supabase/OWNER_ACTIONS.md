Owner actions required for secure shared storage
=============================================

What I changed
--------------
- Frontend now uploads copies into the private shared bucket and will call server-side SECURITY DEFINER RPCs to create cabinet_* rows. See branch: `supabase/secure-shares`.
- Helper `src/lib/sharedCopy.ts` now only uploads and returns { uploadedBucket, publicUrl } and DOES NOT perform any client-side inserts into `cabinet_*` tables.
- Dialog `src/components/cabinet/ShareToCollaborativeDialog.tsx` now calls server RPCs (eg. `share_document_to_cabinet_with_url`, `share_client_to_cabinet_with_url`, `share_dossier_to_cabinet`, `share_contrat_to_cabinet`) instead of inserting/updating tables in the client.
- Added a migration file `supabase/migrations/2025-11-13_storage_objects_rls_owner_required.sql` that contains the RLS / policy statements required on `storage.objects`. The statements are intentionally commented-out and annotated because they must be run by the DB owner.

Why owner action is needed
-------------------------
Supabase's storage schema (`storage.objects`) is owned by a managed role (e.g. `supabase_storage_admin`). Only the project owner can ALTER the table to enable RLS or change policies. Attempts to run these statements as a regular SQL user will raise `ERROR: permission denied for relation storage.objects` (42501).

Exact steps for the owner (recommended)
--------------------------------------
1) Review the branch and PR: https://github.com/louispgnc-maker/neira-pro-suite-main/pull/new/supabase/secure-shares

2) In the Supabase SQL editor (or via psql as owner), run the following statements as the project owner. These are the same statements present in `supabase/migrations/2025-11-13_storage_objects_rls_owner_required.sql` but UNCOMMENTED. They will enable RLS and create policies so only cabinet members can access objects whose path starts with `<cabinetId>/...`.

-- START OWNER-ONLY SQL

BEGIN;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cabinet_members_read_objects" ON storage.objects
  FOR SELECT USING (
    (
      case when name is null then false
      else (
        split_part(name, '/', 1) ~ '^[0-9a-fA-F\\-]{36}$' AND (
          (split_part(name, '/', 1))::uuid IN (
            select cm.cabinet_id from public.cabinet_members cm
            where cm.user_id = auth.uid() and cm.status = 'active'
          )
        )
      ) end
    )
  );

CREATE POLICY "cabinet_members_insert_objects" ON storage.objects
  FOR INSERT WITH CHECK (
    (
      case when name is null then false
      else (
        split_part(name, '/', 1) ~ '^[0-9a-fA-F\\-]{36}$' AND (
          (split_part(name, '/', 1))::uuid IN (
            select cm.cabinet_id from public.cabinet_members cm
            where cm.user_id = auth.uid() and cm.status = 'active'
          )
        )
      ) end
    )
  );

CREATE POLICY "cabinet_members_modify_objects" ON storage.objects
  FOR UPDATE, DELETE USING (
    (
      case when name is null then false
      else (
        split_part(name, '/', 1) ~ '^[0-9a-fA-F\\-]{36}$' AND (
          (split_part(name, '/', 1))::uuid IN (
            select cm.cabinet_id from public.cabinet_members cm
            where cm.user_id = auth.uid() and cm.status = 'active'
          )
        )
      ) end
    )
  );

COMMIT;

-- END OWNER-ONLY SQL

3) (Optional) If you prefer to let the storage service role perform uploads and avoid client INSERT permission, consider limiting INSERT policy to the service role and only allow SELECT for members. Adjust policies accordingly.

4) After the owner SQL is applied, run the migration files normally (or you can leave them; the branch already contains the migration file for review). Confirm that the frontend behavior works: when sharing, files are uploaded to `<cabinetId>/...` and cabinet members can access them.

Notes & rollback
----------------
- If you need to revert RLS changes, you can drop policies and disable RLS using the Supabase SQL editor as owner. Keep a backup of existing policy definitions.
- I can prepare a support-ticket text for the Supabase team if you'd rather have them run these statements (I flagged this earlier).

If you want, I can also:
- run a small backfill script to move existing objects from `shared-documents` into `<cabinetId>/...` and update DB rows (requires owner for some steps), or
- open a PR from the `supabase/secure-shares` branch with a short description and checklist for reviewers.

— Assistant (branch: supabase/secure-shares)
