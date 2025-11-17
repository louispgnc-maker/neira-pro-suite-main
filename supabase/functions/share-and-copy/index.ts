// share-and-copy Edge Function
// Copies a file from the 'documents' bucket into 'shared-documents' and
// creates a cabinet_documents row using the service role key. This function
// runs with elevated privileges (service role) and MUST be deployed to a
// trusted server-side environment. The client should call this function via
// a bearer token (the user's access token) so the function can validate
// membership before performing privileged operations.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("PROJECT_URL") || Deno.env.get("SERVICE_URL") || '';
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_KEY") || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or service role key (SUPABASE_SERVICE_ROLE_KEY / SERVICE_ROLE_KEY / SERVICE_KEY) in function environment');
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const auth = req.headers.get('Authorization') || '';
    const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!jwt) return new Response(JSON.stringify({ error: 'Missing bearer token' }), { status: 401 });

    const body = await req.json().catch(() => ({}));
    const documentId = body.document_id || body.documentId || null;
    const cabinetId = body.cabinet_id || body.cabinetId || null;

    if (!documentId || !cabinetId) return new Response(JSON.stringify({ error: 'Missing document_id or cabinet_id' }), { status: 400 });

    // Validate the calling user
    const { data: userInfo, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userInfo?.user) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
    const callerId = userInfo.user.id;

    // Verify membership: either owner OR active member of provided cabinet
    const { data: membersData, error: membersErr } = await admin
      .from('cabinet_members')
      .select('id')
      .eq('cabinet_id', cabinetId)
      .eq('user_id', callerId)
      .eq('status', 'active')
      .limit(1);
    if (membersErr) return new Response(JSON.stringify({ error: 'Membership check failed' }), { status: 500 });
    let isMember = Array.isArray(membersData) && membersData.length > 0;
    if (!isMember) {
      const { data: ownerData } = await admin.rpc('is_cabinet_owner', { cabinet_id_param: cabinetId, user_id_param: callerId });
      const isOwner = (typeof ownerData === 'boolean' && ownerData) || (Array.isArray(ownerData) && ownerData.length > 0 && ownerData[0]);
      if (!isOwner) return new Response(JSON.stringify({ error: 'Not a member' }), { status: 403 });
    }

    // Fetch document metadata
    const { data: docRow, error: docErr } = await admin
      .from('documents')
      .select('id,storage_path,name,content_type,file_size,owner_id')
      .eq('id', documentId)
      .limit(1)
      .single();
    if (docErr || !docRow) return new Response(JSON.stringify({ error: 'Document not found' }), { status: 404 });

    const sourceBucket = 'documents';
    let sourcePath = (docRow.storage_path || '').replace(/^\/+/, '');
    if (!sourcePath) return new Response(JSON.stringify({ error: 'Document has no storage_path' }), { status: 400 });

    // Create a signed URL for the source and fetch the bytes
    const expires = 120;
    const { data: srcSigned, error: srcSignedErr } = await admin.storage.from(sourceBucket).createSignedUrl(sourcePath, expires);
    if (srcSignedErr || !srcSigned?.signedUrl) {
      console.error('createSignedUrl(source) failed', srcSignedErr);
      return new Response(JSON.stringify({ error: 'Failed to create signed URL for source' }), { status: 500 });
    }

    const fetchResp = await fetch(srcSigned.signedUrl);
    if (!fetchResp.ok) return new Response(JSON.stringify({ error: 'Failed to fetch source object' }), { status: 500 });
    const buffer = new Uint8Array(await fetchResp.arrayBuffer());

    // Prepare target path in shared bucket
    const safeName = String(docRow.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetPath = `${cabinetId}/${docRow.id}-${Date.now()}-${safeName}`;
    const targetBucket = 'shared-documents';

    // Upload to shared bucket
    const { data: upData, error: upErr } = await admin.storage.from(targetBucket).upload(targetPath, buffer, {
      contentType: docRow.content_type || undefined,
      upsert: false,
    });
    if (upErr) {
      console.error('upload to shared-documents failed', upErr);
      return new Response(JSON.stringify({ error: 'Upload to shared bucket failed', details: upErr }), { status: 500 });
    }

    // Create a signed URL for the uploaded object (short-lived) to return to the client
    const { data: newSigned, error: newSignedErr } = await admin.storage.from(targetBucket).createSignedUrl(targetPath, 60);
    const publicUrl = newSigned?.signedUrl ?? null;

    // Insert cabinet_documents row
    const insertPayload: any = {
      cabinet_id: cabinetId,
      document_id: docRow.id,
      title: docRow.name || safeName,
      description: null,
      file_url: publicUrl,
      file_name: docRow.name || safeName,
      file_size: docRow.file_size || null,
      file_type: docRow.content_type || null,
      shared_by: callerId,
    };

    const { data: inserted, error: insertErr } = await admin.from('cabinet_documents').insert(insertPayload).select().single();
    if (insertErr) {
      console.error('failed to insert cabinet_documents', insertErr);
      return new Response(JSON.stringify({ error: 'Failed to create cabinet_documents row', details: insertErr }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true, inserted, uploadedBucket: targetBucket, targetPath, publicUrl }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('share-and-copy function error', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
});
