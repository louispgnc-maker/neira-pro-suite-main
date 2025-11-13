// Deno Supabase Edge Function: share-and-copy
// Copies an object from a source bucket (usually 'documents') into the
// shared bucket under a cabinet-prefixed path (eg. 'shared-documents/<cabinetId>/...')
// Requires SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY / SERVICE_KEY) and SUPABASE_URL in env.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("PROJECT_URL") || Deno.env.get("SERVICE_URL") || '';
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_KEY") || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or service role key for share-and-copy function');
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const auth = req.headers.get('Authorization') || '';
    const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!jwt) return new Response(JSON.stringify({ error: 'Missing bearer token' }), { status: 401 });

    const body = await req.json();
    // Log input (avoid logging secrets/tokens)
    try {
      console.log('share-and-copy called with', {
        sourceBucket: body.sourceBucket || 'documents',
        sourcePath: body.sourcePath || body.path || null,
        cabinetId: body.cabinet_id || body.cabinetId || null,
        documentId: body.document_id || body.documentId || null,
        filename: body.filename || null,
      });
    } catch (e) {
      // ignore logging errors
    }
    const sourceBucket = body.sourceBucket || 'documents';
    let sourcePath = body.sourcePath || body.path || '';
    const cabinetId = body.cabinet_id || body.cabinetId || null;
    const documentId = body.document_id || body.documentId || null;
    const filenameHint = body.filename || null;

    if (!sourcePath) return new Response(JSON.stringify({ error: 'Missing sourcePath' }), { status: 400 });
    sourcePath = String(sourcePath).replace(/^\/+/, '');
    if (!cabinetId) return new Response(JSON.stringify({ error: 'Missing cabinetId' }), { status: 400 });

    // Validate user token (ensure caller is a real user)
    const { data: userInfo, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userInfo?.user) {
      console.error('auth.getUser failed', userErr);
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
    }
    const callerId = userInfo.user.id;
    console.log('share-and-copy callerId:', callerId);

    // Verify membership of the cabinet (owner or active member)
    const { data: membersData, error: membersErr } = await admin
      .from('cabinet_members')
      .select('id')
      .eq('cabinet_id', cabinetId)
      .eq('user_id', callerId)
      .eq('status', 'active')
      .limit(1);
    if (membersErr) return new Response(JSON.stringify({ error: 'Membership check failed' }), { status: 500 });
    if (!Array.isArray(membersData) || membersData.length === 0) {
      // also allow owner
      const { data: ownerData, error: ownerErr } = await admin.rpc('is_cabinet_owner', { cabinet_id_param: cabinetId, user_id_param: callerId });
      if (ownerErr) console.error('is_cabinet_owner RPC error', ownerErr);
      const isOwner = (typeof ownerData === 'boolean' && ownerData) || (Array.isArray(ownerData) && ownerData.length > 0 && ownerData[0]);
      console.log('membership check: isOwner=', Boolean(isOwner));
      if (!isOwner) return new Response(JSON.stringify({ error: 'Not a member' }), { status: 403 });
    }

    // Determine filename and target path
    const filename = filenameHint || sourcePath.split('/').pop() || (documentId ? `${documentId}` : 'file');
    const targetPath = `${cabinetId}/${documentId ? documentId + '-' : ''}${filename}`;

    const BUCKET_CANDIDATES = ['shared-documents', 'shared_documents'];

    // Download source object
    const { data: downloaded, error: downloadErr } = await admin.storage.from(sourceBucket).download(sourcePath);
    if (downloadErr) {
      console.error('download error', downloadErr);
      return new Response(JSON.stringify({ error: 'Failed to download source object', details: (downloadErr && downloadErr.message) || downloadErr }), { status: 500 });
    }
    console.log('downloaded source object size:', (downloaded as any)?.size || 'unknown');

    // Try uploading into shared buckets
    let uploadedBucket: string | null = null;
    for (const b of BUCKET_CANDIDATES) {
      try {
        console.log('attempting upload to bucket', b, 'targetPath', targetPath);
        const { error: uploadErr } = await admin.storage.from(b).upload(targetPath, downloaded as any, { upsert: true });
        if (!uploadErr) { uploadedBucket = b; console.log('upload succeeded to', b); break; }
        console.warn(`Upload to bucket ${b} failed:`, uploadErr && (uploadErr.message || uploadErr));
      } catch (e) {
        console.warn(`Upload attempt to bucket ${b} threw:`, e && (e.message || e));
      }
    }

    if (!uploadedBucket) {
      console.error('no bucket accepted the upload', BUCKET_CANDIDATES);
      return new Response(JSON.stringify({ error: 'Upload to shared buckets failed', bucketsTried: BUCKET_CANDIDATES }), { status: 500 });
    }

    // Return the storage path that clients can use (eg. 'shared-documents/<cabinetId>/...')
  const storagePath = `${uploadedBucket}/${targetPath}`;
  console.log('share-and-copy success, storagePath=', storagePath);
  return new Response(JSON.stringify({ storagePath, bucket: uploadedBucket, path: targetPath }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('share-and-copy exception', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
});
