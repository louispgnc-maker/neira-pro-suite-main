# Create a public `shared_documents` bucket (Supabase)

This file documents two ways to create a public `shared_documents` bucket in your Supabase project.

IMPORTANT: creating a public bucket exposes uploaded files to anyone with the URL. If you need stricter access control, prefer a signed-url server approach instead.

## Option A — Supabase Studio (recommended / easiest)
1. Open your Supabase project in the browser: https://app.supabase.com/
2. Select your project.
3. In the left sidebar choose "Storage" → "Buckets".
4. Click "New bucket".
5. Set the bucket name to one of:
  - `shared-documents` (recommended)
  - `shared_documents` (alternative)
6. Enable "Public" (so objects are accessible via a public URL).
7. Create the bucket.

That's it — no code change required. Make sure your app points to the chosen shared bucket (`shared-documents` or `shared_documents`) when constructing public URLs.

## Option B — REST API (requires SERVICE_ROLE key)

Use this if you prefer to automate bucket creation. This requires the Supabase project's service_role key (keep secret).

Replace `<PROJECT_REF>` and `SERVICE_ROLE_KEY` below.

curl example:

```bash
curl -X POST \
  "https://<PROJECT_REF>.supabase.co/storage/v1/bucket" \
  -H "apiKey: SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "shared-documents", "public": true }'
```

Response: 201 with bucket info on success.

## After bucket creation
- Verify in Supabase Studio that the chosen bucket (`shared-documents` or `shared_documents`) exists and is public.
- If you already shared documents using the app, check the bucket for files under `${cabinetId}/${itemId}-{filename}`.
- If you want to make existing files public, either copy them into the `shared_documents` bucket (the app now attempts this automatically when sharing) or use the Storage UI to move/copy files.

## Security note
- Public bucket = files accessible by anyone with the URL. If you need privacy, implement a server-side signed URL generator using the service role key and an authenticated endpoint, or configure per-object policies and use signed URLs.

If you want, I can also generate a small script to copy existing `documents` objects into the chosen shared bucket for all rows in `cabinet_documents` that lack a `file_url` public link. Tell me if you'd like that and whether you have the service role key available to run the script.
