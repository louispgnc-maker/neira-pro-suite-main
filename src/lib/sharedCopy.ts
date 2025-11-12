import { supabase } from '@/lib/supabaseClient';

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
      // try fallback: create a signed URL from original documents bucket so users can access temporarily
      try {
        const signed = await supabase.storage.from('documents').createSignedUrl(storagePathRaw, 60 * 60 * 24 * 7);
        const signedUrl = signed?.data?.signedUrl || null;
        return { uploadedBucket: null, publicUrl: signedUrl };
      } catch (e) {
        console.warn('Signed URL fallback also failed', e);
        return { uploadedBucket: null, publicUrl: null };
      }
    }

    const { data: pub } = await supabase.storage.from(uploadedBucket).getPublicUrl(targetPath);
    const publicUrl = (pub && (pub as any).data && (pub as any).data.publicUrl) || (pub as any)?.publicUrl || null;

    // Revert behavior: create / update a cabinet_documents row from the client so the
    // sharing flow works as it did previously. If RLS blocks this in the running DB
    // the insert/update will fail at runtime; this restores the client-side flow.
    try {
      // Try to get auth user id if available
      let sharedBy: string | null = null;
      try {
        const userRes: any = await (supabase.auth as any).getUser();
        sharedBy = userRes?.data?.user?.id || null;
      } catch (e) {
        // ignore: not critical
      }

      if (publicUrl) {
        // Try insert first; if unique constraint exists, fall back to update
        const payload = {
          cabinet_id: cabinetId,
          document_id: documentId,
          title: itemName || filename,
          description: null,
          file_url: publicUrl,
          file_name: filename,
          file_type: 'application/pdf',
          shared_by: sharedBy,
        } as any;

        try {
          const { data: insertData, error: insertErr } = await supabase.from('cabinet_documents').insert(payload).select();
          if (insertErr) {
            // If unique violation or other conflict, attempt an update
            console.warn('insert cabinet_documents failed, attempting update:', insertErr.message || insertErr);
            const { data: up, error: upErr } = await supabase.from('cabinet_documents').update(payload).match({ cabinet_id: cabinetId, document_id: documentId }).select();
            if (upErr) console.warn('update cabinet_documents also failed:', upErr);
          }
        } catch (e) {
          console.warn('cabinet_documents insert/update threw:', e);
        }
      }
    } catch (e) {
      console.warn('Failed to create cabinet_documents row after upload:', e);
    }

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
      // fallback: signed URL from original bucket
      try {
        const signed = await supabase.storage.from('documents').createSignedUrl(storagePathRaw, 60 * 60 * 24 * 7);
        const signedUrl = signed?.data?.signedUrl || null;
        return { uploadedBucket: null, publicUrl: signedUrl };
      } catch (e) {
        return { uploadedBucket: null, publicUrl: null };
      }
    }

    const { data: pub } = await supabase.storage.from(uploadedBucket).getPublicUrl(targetPath);
    const publicUrl = (pub && (pub as any).data && (pub as any).data.publicUrl) || (pub as any)?.publicUrl || null;

    // Revert behavior: create / update a cabinet_clients row from the client so the
    // sharing flow works as it did previously.
    try {
      let sharedBy: string | null = null;
      try {
        const userRes: any = await (supabase.auth as any).getUser();
        sharedBy = userRes?.data?.user?.id || null;
      } catch (e) { /* noop */ }

      if (publicUrl) {
        const payload = {
          cabinet_id: cabinetId,
          client_id: clientId,
          file_url: publicUrl,
          file_name: filename,
          file_type: 'application/pdf',
          description: null,
          shared_by: sharedBy,
        } as any;
        try {
          const { data: insertData, error: insertErr } = await supabase.from('cabinet_clients').insert(payload).select();
          if (insertErr) {
            console.warn('insert cabinet_clients failed, attempting update:', insertErr.message || insertErr);
            const { data: up, error: upErr } = await supabase.from('cabinet_clients').update(payload).match({ cabinet_id: cabinetId, client_id: clientId }).select();
            if (upErr) console.warn('update cabinet_clients also failed:', upErr);
          }
        } catch (e) {
          console.warn('cabinet_clients insert/update threw:', e);
        }
      }
    } catch (e) {
      console.warn('Failed to create cabinet_clients row after upload:', e);
    }

    return { uploadedBucket, publicUrl };
  } catch (e) {
    console.error('copyClientFileToShared error', e);
    return { uploadedBucket: null, publicUrl: null };
  }
}
