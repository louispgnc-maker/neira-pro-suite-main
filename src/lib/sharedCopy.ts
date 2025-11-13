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
          // `downloaded` is a Blob (or null). Supabase upload accepts Blob/File/ReadableStream.
          const payload = downloaded as Blob | ArrayBuffer | null;
          const { error: uploadErr } = await supabase.storage.from(b).upload(targetPath, payload, { upsert: true });
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
      // Prefer server-side copy: call our Edge Function 'share-and-copy' which
      // will perform the copy into the shared bucket under the cabinet prefix
      // and return a storage path like 'shared-documents/<cabinetId>/...'.
      try {
        const session = await supabase.auth.getSession();
        const token = session?.data?.session?.access_token;
        if (token && import.meta.env.VITE_SUPABASE_URL) {
          const fnUrl = `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/,'')}/functions/v1/share-and-copy`;
          const res = await fetch(fnUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ sourceBucket: 'documents', sourcePath: storagePathRaw, cabinet_id: cabinetId, document_id: documentId, filename }),
          });
          if (res.ok) {
            const json = await res.json();
            if (json?.storagePath) {
              // If the edge function returned a storage path (eg. "shared-documents/...")
              // try to convert it into a public HTTP URL so the collaborative space
              // can open it directly without membership checks.
              try {
                const sp: string = String(json.storagePath).replace(/^\/+/, '');
                // determine bucket and path
                let bucket = 'shared-documents';
                let path = sp;
                if (sp.startsWith('shared_documents/') || sp.startsWith('shared-documents/')) {
                  bucket = sp.startsWith('shared-documents/') ? 'shared-documents' : 'shared_documents';
                  path = sp.replace(/^shared[-_]documents\//, '');
                } else if (sp.includes('/')) {
                  const maybe = sp.split('/')[0];
                  if (maybe === 'shared_documents' || maybe === 'shared-documents') {
                    bucket = maybe;
                    path = sp.split('/').slice(1).join('/');
                  }
                }

                const { data: publicData } = await supabase.storage.from(bucket).getPublicUrl(path);
                const publicUrl = publicData?.publicUrl ?? null;
                if (publicUrl) return { uploadedBucket: bucket, publicUrl };
                // otherwise fall through and return the raw storagePath
                return { uploadedBucket: null, publicUrl: json.storagePath };
              } catch (e) {
                // If conversion fails, return the provided storagePath so caller can
                // still handle it (existing fallback logic will try signed URLs).
                return { uploadedBucket: null, publicUrl: json.storagePath };
              }
            }
          }
        }
      } catch (e) {
        console.warn('share-and-copy function call failed', e);
      }

      // Older fallback: try signed URL for original object so members can still access it
      try {
        const { signedUrl } = await getSignedUrlForPath({ bucket: 'documents', path: storagePathRaw, cabinetId, expires: 60 * 60 * 24 * 7 });
        return { uploadedBucket: null, publicUrl: signedUrl ?? null };
      } catch (e) {
        console.warn('Signed URL fallback via function also failed', e);
        return { uploadedBucket: null, publicUrl: null };
      }
    }

    const { data: publicData } = await supabase.storage.from(uploadedBucket).getPublicUrl(targetPath);
    const publicUrl = publicData?.publicUrl ?? null;

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
        const payload = downloaded as Blob | ArrayBuffer | null;
        const { error: uploadErr } = await supabase.storage.from(b).upload(targetPath, payload, { upsert: true });
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
        const session = await supabase.auth.getSession();
        const token = session?.data?.session?.access_token;
        if (token && import.meta.env.VITE_SUPABASE_URL) {
          const fnUrl = `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/,'')}/functions/v1/share-and-copy`;
          // For client files we want the target path to include the clients/ prefix
          const filenameWithPrefix = `clients/${clientId}-${filename}`;
          const res = await fetch(fnUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ sourceBucket: 'documents', sourcePath: storagePathRaw, cabinet_id: cabinetId, filename: filenameWithPrefix }),
          });
          if (res.ok) {
            const json = await res.json();
            if (json?.storagePath) {
              try {
                const sp: string = String(json.storagePath).replace(/^\/+/, '');
                let bucket = 'shared-documents';
                let path = sp;
                if (sp.startsWith('shared_documents/') || sp.startsWith('shared-documents/')) {
                  bucket = sp.startsWith('shared-documents/') ? 'shared-documents' : 'shared_documents';
                  path = sp.replace(/^shared[-_]documents\//, '');
                } else if (sp.includes('/')) {
                  const maybe = sp.split('/')[0];
                  if (maybe === 'shared_documents' || maybe === 'shared-documents') {
                    bucket = maybe;
                    path = sp.split('/').slice(1).join('/');
                  }
                }

                const { data: publicData } = await supabase.storage.from(bucket).getPublicUrl(path);
                const publicUrl = publicData?.publicUrl ?? null;
                if (publicUrl) return { uploadedBucket: bucket, publicUrl };
                return { uploadedBucket: null, publicUrl: json.storagePath };
              } catch (e) {
                return { uploadedBucket: null, publicUrl: json.storagePath };
              }
            }
          }
        }
      } catch (e) {
        console.warn('share-and-copy function call failed', e);
      }

      try {
        const { signedUrl } = await getSignedUrlForPath({ bucket: 'documents', path: storagePathRaw, cabinetId, expires: 60 * 60 * 24 * 7 });
        return { uploadedBucket: null, publicUrl: signedUrl ?? null };
      } catch (e) {
        console.warn('Signed URL fallback via function failed', e);
        return { uploadedBucket: null, publicUrl: null };
      }
    }

  const { data: publicData } = await supabase.storage.from(uploadedBucket).getPublicUrl(targetPath);
  const publicUrl = publicData?.publicUrl ?? null;

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
