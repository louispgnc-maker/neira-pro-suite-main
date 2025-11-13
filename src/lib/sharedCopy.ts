import { supabase } from '@/lib/supabaseClient';
import { getSignedUrlForPath } from './storageHelpers';

const BUCKET_CANDIDATES = ['shared-documents', 'shared_documents'];

export async function copyDocumentToShared({
  cabinetId,
  documentId,
  sharedId,
  itemName,
}: {
  cabinetId: string;
  documentId: string;
  sharedId?: string | number | null;
  itemName?: string | null;
}): Promise<{ uploadedBucket: string | null; publicUrl: string | null }> {
  try {
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .select('storage_path')
      .eq('id', documentId)
      .single();
    if (docErr) throw docErr;

    const storagePathRaw = (doc?.storage_path || '').replace(/^\/+/, '');
    if (!storagePathRaw) throw new Error('storage_path not found');

    const { data: downloaded, error: downloadErr } = await supabase.storage.from('documents').download(storagePathRaw);
    if (downloadErr) throw downloadErr;

    const filename = storagePathRaw.split('/').pop() || itemName || `${documentId}.pdf`;
    const targetPath = `${cabinetId}/${documentId}-${filename}`;

    let uploadedBucket: string | null = null;
    for (const b of BUCKET_CANDIDATES) {
      try {
        const { error: uploadErr } = await supabase.storage.from(b).upload(targetPath, downloaded as any, { upsert: true });
        if (!uploadErr) { uploadedBucket = b; break; }
        console.warn(`Upload to bucket ${b} failed:`, uploadErr.message || uploadErr);
      } catch (e) {
        console.warn(`Upload attempt to bucket ${b} threw:`, e);
      }
    }

    if (!uploadedBucket) {
      // try fallback: ask our Edge Function (server-side) for a signed URL which
      // enforces cabinet membership. This avoids using client-side createSignedUrl
      // which will fail when RLS/storage rules block it, and avoids attempting
      // to upload into a shared bucket that may not exist.
      try {
        const { signedUrl } = await getSignedUrlForPath({ bucket: 'documents', path: storagePathRaw, cabinetId, expires: 60 * 60 * 24 * 7 });
        return { uploadedBucket: null, publicUrl: signedUrl };
      } catch (e) {
        console.warn('Signed URL fallback via function also failed', e);
        return { uploadedBucket: null, publicUrl: null };
      }
    }

    const { data: pub } = await supabase.storage.from(uploadedBucket).getPublicUrl(targetPath);
    const publicUrl = (pub && (pub as any).data && (pub as any).data.publicUrl) || (pub as any)?.publicUrl || null;

    // Server-side writes are required for secure sharing. The helper must NOT
    // attempt to create cabinet_* rows client-side (RLS will usually block it).
    // The frontend should call the appropriate SECURITY DEFINER RPC (eg.
    // share_document_to_cabinet_with_url) after receiving the publicUrl.

    return { uploadedBucket, publicUrl };
  } catch (e) {
    console.error('copyDocumentToShared error', e);
    return { uploadedBucket: null, publicUrl: null };
  }
}

export async function copyClientFileToShared({
  cabinetId,
  clientId,
  storagePath,
  itemName,
}: {
  cabinetId: string;
  clientId: string;
  storagePath: string;
  itemName?: string | null;
}): Promise<{ uploadedBucket: string | null; publicUrl: string | null }> {
  try {
    const storagePathRaw = (storagePath || '').replace(/^\/+/, '');
    if (!storagePathRaw) throw new Error('storage_path not provided');

    const { data: downloaded, error: downloadErr } = await supabase.storage.from('documents').download(storagePathRaw);
    if (downloadErr) throw downloadErr;

    const filename = storagePathRaw.split('/').pop() || itemName || `${clientId}`;
    const targetPath = `${cabinetId}/clients/${clientId}-${filename}`;

    let uploadedBucket: string | null = null;
    const BUCKET_CANDIDATES = ['shared-documents', 'shared_documents'];
    for (const b of BUCKET_CANDIDATES) {
      try {
        const { error: uploadErr } = await supabase.storage.from(b).upload(targetPath, downloaded as any, { upsert: true });
        if (!uploadErr) { uploadedBucket = b; break; }
        console.warn(`Upload to bucket ${b} failed:`, uploadErr.message || uploadErr);
      } catch (e) {
        console.warn(`Upload attempt to bucket ${b} threw:`, e);
      }
    }

    if (!uploadedBucket) {
      // fallback: ask Edge Function for a signed URL (preferred) instead of
      // using client-side createSignedUrl which may be blocked by RLS.
      try {
        const { signedUrl } = await getSignedUrlForPath({ bucket: 'documents', path: storagePathRaw, cabinetId, expires: 60 * 60 * 24 * 7 });
        return { uploadedBucket: null, publicUrl: signedUrl };
      } catch (e) {
        console.warn('Signed URL fallback via function failed', e);
        return { uploadedBucket: null, publicUrl: null };
      }
    }

    const { data: pub } = await supabase.storage.from(uploadedBucket).getPublicUrl(targetPath);
    const publicUrl = (pub && (pub as any).data && (pub as any).data.publicUrl) || (pub as any)?.publicUrl || null;

    // Server-side writes are required for secure sharing. Do not create or
    // update `cabinet_clients` from the client. Instead, callers should invoke
    // a SECURITY DEFINER RPC such as `share_client_to_cabinet_with_url` with the
    // returned publicUrl so the database write happens server-side under the
    // definers privileges.

    return { uploadedBucket, publicUrl };
  } catch (e) {
    console.error('copyClientFileToShared error', e);
    return { uploadedBucket: null, publicUrl: null };
  }
}
