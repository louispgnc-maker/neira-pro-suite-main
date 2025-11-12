#!/usr/bin/env node
// Backfill script: copy client id_doc_path files to shared bucket and create cabinet_clients rows
// Usage: node scripts/backfill_clients_to_cabinet.js <CABINET_ID>
// Note: run this from the project root. Requires a valid supabase client config in src/lib/supabaseClient.js

const path = require('path');
const fs = require('fs');

const { supabase } = require('../src/lib/supabaseClient');

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    console.error('Usage: node scripts/backfill_clients_to_cabinet.js <CABINET_ID>');
    process.exit(1);
  }
  const cabinetId = argv[0];

  const bucketCandidates = ['shared-documents', 'shared_documents'];

  try {
    // Fetch clients that have an id_doc_path and are not yet shared in this cabinet
    const { data: clients, error: clientsErr } = await supabase
      .from('clients')
      .select('id,name,id_doc_path')
      .not('id_doc_path', 'is', null);
    if (clientsErr) throw clientsErr;
    console.log(`Found ${clients.length} clients with id_doc_path`);

    for (const c of clients) {
      // skip if already shared
      const { data: existing, error: exErr } = await supabase
        .from('cabinet_clients')
        .select('id')
        .eq('cabinet_id', cabinetId)
        .eq('client_id', c.id)
        .limit(1);
      if (exErr) { console.warn('Error checking existing cabinet_clients for', c.id, exErr); continue; }
      if (existing && existing.length > 0) {
        console.log('Skipping already-shared client', c.id);
        continue;
      }

      // download original file
      const storagePathRaw = (c.id_doc_path || '').replace(/^\/+/, '');
      if (!storagePathRaw) { console.log('No storage path for', c.id); continue; }

      try {
        const { data: downloaded, error: dlErr } = await supabase.storage.from('documents').download(storagePathRaw);
        if (dlErr) throw dlErr;

        const filename = storagePathRaw.split('/').pop() || c.name || `${c.id}`;
        const targetPath = `${cabinetId}/clients/${c.id}-${filename}`;

        let uploadedBucket = null;
        for (const b of bucketCandidates) {
          try {
            const { error: upErr } = await supabase.storage.from(b).upload(targetPath, downloaded, { upsert: true });
            if (!upErr) { uploadedBucket = b; break; }
          } catch (e) {
            console.warn('Upload attempt failed for bucket', b, e?.message || e);
          }
        }

        let publicUrl = null;
        if (uploadedBucket) {
          const pub = await supabase.storage.from(uploadedBucket).getPublicUrl(targetPath);
          publicUrl = (pub && pub.data && pub.data.publicUrl) || pub.publicUrl || null;
        } else {
          // fallback: signed URL from original 'documents' path
          try {
            const signed = await supabase.storage.from('documents').createSignedUrl(storagePathRaw, 60 * 60 * 24 * 7);
            publicUrl = signed?.data?.signedUrl || null;
          } catch (e) {
            console.warn('Signed URL fallback failed for', c.id, e?.message || e);
          }
        }

        // call RPC to create cabinet_clients row with the public URL
        const { data: rpcData, error: rpcErr } = await supabase.rpc('share_client_to_cabinet_with_url', {
          cabinet_id_param: cabinetId,
          client_id_param: c.id,
          file_url_param: publicUrl,
          description_param: null,
          file_name_param: filename,
          file_type_param: 'application/pdf',
        });
        if (rpcErr) throw rpcErr;
        console.log('Shared client', c.id, '->', rpcData);
      } catch (e) {
        console.error('Failed to backfill client', c.id, e?.message || e);
      }
    }

    console.log('Backfill complete');
  } catch (e) {
    console.error('Backfill script error', e?.message || e);
    process.exit(2);
  }
}

main();
