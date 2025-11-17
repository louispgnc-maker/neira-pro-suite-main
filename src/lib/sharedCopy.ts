import { supabase } from '@/lib/supabaseClient';

// Try to perform a server-side share by invoking the Edge Function
// 'share-and-copy'. This avoids exposing privileged credentials in the
// frontend and prevents RLS violations by executing the copy + DB insert
// with the service role key on the server.
export async function copyDocumentToShared({ cabinetId, documentId }: { cabinetId: string; documentId: string; sharedId?: string | number | null; itemName?: string | null; }): Promise<{ uploadedBucket: string | null; publicUrl: string | null }> {
  try {
    const session = await supabase.auth.getSession();
    const token = session?.data?.session?.access_token;
    if (!token) {
      console.warn('copyDocumentToShared: no user session available');
      return { uploadedBucket: null, publicUrl: null };
    }

    const base = import.meta.env.VITE_SUPABASE_URL;
    if (!base) {
      console.warn('copyDocumentToShared: VITE_SUPABASE_URL not configured');
      return { uploadedBucket: null, publicUrl: null };
    }

    const fnUrl = `${String(base).replace(/\/+$/,'')}/functions/v1/share-and-copy`;
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ document_id: documentId, cabinet_id: cabinetId }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('share-and-copy function returned error', res.status, json);
      return { uploadedBucket: null, publicUrl: null };
    }

    // Success: return bucket and publicUrl if present
    return { uploadedBucket: json.uploadedBucket ?? null, publicUrl: json.publicUrl ?? null };
  } catch (e) {
    console.error('copyDocumentToShared error', e);
    return { uploadedBucket: null, publicUrl: null };
  }
}

export async function copyClientFileToShared({ cabinetId, clientId }: { cabinetId: string; clientId: string; storagePath?: string; itemName?: string | null; }): Promise<{ uploadedBucket: string | null; publicUrl: string | null }> {
  // For now, keep client-file sharing disabled until we have a clear
  // input contract for copying arbitrary client files into the shared
  // bucket. Use the document-based flow above when possible.
  console.warn('copyClientFileToShared: disabled (use document-based sharing)');
  return { uploadedBucket: null, publicUrl: null };
}
