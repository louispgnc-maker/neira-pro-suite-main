#!/usr/bin/env node
/*
  backfill_shared_docs (CommonJS)

*/

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const url = require('url');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');
const deleteOriginal = false; // change to true if you want originals removed after copy
const bucket = 'shared-documents';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('Starting backfill (dryRun=', dryRun, ')');

  const { data: rows, error } = await supabase
    .from('cabinet_documents')
    .select('id, cabinet_id, document_id, file_url, file_name')
    .ilike('file_url', `%${bucket}%`)
    .limit(1000);

  if (error) {
    console.error('Failed to query cabinet_documents:', error);
    process.exit(1);
  }

  console.log(`Found ${rows.length} cabinet_documents rows referencing ${bucket}`);
  for (const r of rows) {
    try {
      if (!r.file_url) continue;
      const parsed = url.parse(r.file_url);
      const parts = parsed.pathname ? parsed.pathname.split(`/${bucket}/`) : null;
      if (!parts || parts.length < 2) {
        console.warn('Could not derive object path for row', r.id, r.file_url);
        continue;
      }
      const objectPath = decodeURIComponent(parts[1].replace(/^\/+/, ''));
      const filename = r.file_name || path.basename(objectPath) || `${r.document_id}`;
      const targetPath = `${r.cabinet_id}/${r.document_id}-${filename}`;

      console.log(`Row ${r.id}: object=${objectPath} -> target=${targetPath}`);
      if (dryRun) continue;

      const { data: downloaded, error: downErr } = await supabase.storage.from(bucket).download(objectPath);
      if (downErr) {
        console.warn('Download failed for', objectPath, downErr.message || downErr);
        continue;
      }

      const { error: uploadErr } = await supabase.storage.from(bucket).upload(targetPath, downloaded, { upsert: true });
      if (uploadErr) {
        console.warn('Upload failed for', targetPath, uploadErr.message || uploadErr);
        continue;
      }

      const { data: pub } = await supabase.storage.from(bucket).getPublicUrl(targetPath);
      const publicUrl = (pub && pub.publicUrl) || (pub && pub.data && pub.data.publicUrl) || null;

      if (!publicUrl) {
        console.warn('Failed to obtain publicUrl for', targetPath);
        continue;
      }

      const { data: up, error: upErr } = await supabase.from('cabinet_documents').update({ file_url: publicUrl, file_name: filename }).eq('id', r.id).select();
      if (upErr) {
        console.warn('Failed to update cabinet_documents', r.id, upErr.message || upErr);
        continue;
      }

      console.log('Updated row', r.id, '->', publicUrl);

      if (deleteOriginal) {
        const { error: delErr } = await supabase.storage.from(bucket).remove([objectPath]);
        if (delErr) console.warn('Failed to delete original', objectPath, delErr.message || delErr);
      }
    } catch (e) {
      console.error('Unexpected error processing row', r.id, e.message || e);
    }
  }

  console.log('Backfill completed');
}

main().catch((e) => { console.error(e); process.exit(1); });
