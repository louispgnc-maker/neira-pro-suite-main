#!/usr/bin/env node
/*
  Script de migration (CommonJS): copie les fichiers référencés par `cabinet_documents` (et liés à `documents`)
  depuis le bucket `documents` vers `shared-documents` (ou `shared_documents` en fallback), puis
  met à jour `cabinet_documents.file_url` avec l'URL publique de la copie.

  Usage:
    SUPABASE_URL=https://<PROJECT_REF>.supabase.co \
    SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY> \
    node supabase/scripts/migrate_shared_docs.cjs

  Options:
    --dry-run   : n'effectue pas d'upload ni de mise à jour en base, affiche ce qui serait fait

*/

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_API_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const BUCKET_CANDIDATES = ['shared-documents', 'shared_documents'];

async function fetchDocsToMigrate() {
  const { data, error } = await supabase
    .from('cabinet_documents')
    .select('id, cabinet_id, document_id, file_url')
    .not('document_id', 'is', null);
  if (error) throw error;
  return data;
}

async function getDocumentStoragePath(documentId) {
  const { data, error } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .single();
  if (error) throw error;
  return data?.storage_path || null;
}

async function main() {
  console.log('Starting migration. dryRun =', dryRun);
  const rows = await fetchDocsToMigrate();
  console.log(`Found ${rows.length} cabinet_documents rows with document_id.`);

  for (const row of rows) {
    try {
      const { id: cdId, cabinet_id: cabinetId, document_id: documentId, file_url } = row;

      if (file_url && /^https?:\/\//i.test(String(file_url).trim())) {
        console.log(`[skip] cabinet_documents.id=${cdId} already has public file_url`);
        continue;
      }

      const storagePathRaw = await getDocumentStoragePath(documentId);
      if (!storagePathRaw) {
        console.warn(`[skip] document ${documentId} has no storage_path`);
        continue;
      }
      const storagePath = String(storagePathRaw).replace(/^\/+/, '');
      const filename = storagePath.split('/').pop() || `${documentId}.pdf`;
      const targetPath = `${cabinetId}/${documentId}-${filename}`;

      const { data: signed, error: signErr } = await supabase.storage.from('documents').createSignedUrl(storagePath, 60);
      if (signErr || !signed?.signedUrl) {
        console.warn(`[warn] failed to create signed url for documents/${storagePath} (doc ${documentId}):`, signErr?.message || signErr);
        continue;
      }

      const resp = await fetch(signed.signedUrl);
      if (!resp.ok) {
        console.warn(`[warn] fetch failed for signed url ${signed.signedUrl}: ${resp.status}`);
        continue;
      }
      const arrayBuffer = await resp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      let uploadedBucket = null;
      for (const b of BUCKET_CANDIDATES) {
        if (dryRun) {
          console.log(`[dry-run] would upload to ${b}/${targetPath} (size ${buffer.length})`);
          uploadedBucket = b;
          break;
        }
        const { error: upErr } = await supabase.storage.from(b).upload(targetPath, buffer, { upsert: true, contentType: 'application/pdf' });
        if (!upErr) { uploadedBucket = b; break; }
        console.warn(`Upload to bucket ${b} failed:`, upErr.message || upErr);
      }

      if (!uploadedBucket) {
        console.error(`[fail] No shared bucket accepted upload for document ${documentId}`);
        continue;
      }

      let publicUrl = null;
      if (dryRun) {
        publicUrl = `https://<project>.supabase.co/storage/v1/object/public/${uploadedBucket}/${targetPath}`;
        console.log(`[dry-run] would set cabinet_documents.id=${cdId} file_url=${publicUrl}`);
        continue;
      }

      const { data: pub } = await supabase.storage.from(uploadedBucket).getPublicUrl(targetPath);
      publicUrl = (pub && pub.data && pub.data.publicUrl) || pub?.publicUrl || null;
      if (!publicUrl) {
        console.warn(`[warn] failed to read public url after upload for ${uploadedBucket}/${targetPath}`);
      } else {
        const { error: updErr } = await supabase.from('cabinet_documents').update({ file_url: publicUrl }).eq('id', cdId);
        if (updErr) {
          console.error(`[fail] failed to update cabinet_documents.id=${cdId}:`, updErr.message || updErr);
        } else {
          console.log(`[ok] migrated cabinet_documents.id=${cdId} -> ${uploadedBucket}/${targetPath}`);
        }
      }
    } catch (e) {
      console.error('Unexpected error processing row', row, e);
    }
  }

  console.log('Migration finished');
}

main().catch((err) => { console.error(err); process.exit(2); });
