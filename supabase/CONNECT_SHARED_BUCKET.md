# Connect / Migrate shared documents bucket

This document explains how to make the app stop showing `Partagé (fallback) ... Bucket not found` errors by either:

- using the existing `shared-documents` bucket and copying objects there, or
- updating DB `file_url` fields to point to accessible paths.

Important: the migration scripts require a Supabase service role key. Never expose the service role key publicly.

## Safe workflow (recommended)

1) Inspect which rows reference the shared bucket in your database. Run in psql or Supabase SQL editor:

```sql
SELECT id, cabinet_id, document_id, file_url
FROM public.cabinet_documents
WHERE file_url ILIKE '%shared-documents/%' OR file_url ILIKE '%shared_documents/%';
```

2) Dry-run the repo migration script locally to see what would be changed (no secrets required for dry-run if scripts support it). From repository root:

```bash
# Dry-run: prints actions, does not require service key
node tools/migrate-shared-bucket.js --dry-run
```

3) If the dry-run output looks good, run the migration with your SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL set. Do this from a secure environment (your machine or CI where the key is not leaked):

```bash
export SUPABASE_URL=https://<PROJECT_REF>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
node tools/migrate-shared-bucket.js --run
```

This wrapper will run the `supabase/scripts/migrate_shared_docs.js` and then `supabase/scripts/backfill_shared_docs.js` (if present). The scripts will attempt to copy objects and update DB rows.

4) Verify results in the DB and by opening a few documents in the app. If something looks wrong, restore from your DB backup or revert changes.

## If you don't want to copy objects

An alternative to copying objects to the shared bucket is to update `file_url` fields to point back to `documents/...` or to public URLs you control. This is a data-only change and doesn't require copying files, but you must ensure the referenced objects exist and the RLS policies allow access.

Example SQL to update file URLs (perform on a test DB first):

```sql
UPDATE public.cabinet_documents
SET file_url = replace(file_url, 'shared-documents/', 'documents/')
WHERE file_url ILIKE '%shared-documents/%';
```

## Troubleshooting

- If after migration you still see errors, check whether the storage objects were actually copied into the target bucket and that the object paths match the DB rows.
- If the edge function `get-signed-url` was disabled intentionally, the client will still fallback to `createSignedUrl` — ensure the anon key has access or use the service role for migration.

## Security note

Service-role keys can bypass RLS and have full access. Do not store them in the repo or expose them in client-side code. Use them only from secure servers or your local machine for one-off migration tasks.
