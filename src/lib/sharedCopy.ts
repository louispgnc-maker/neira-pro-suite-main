import { supabase } from '@/lib/supabaseClient';
import { getSignedUrlForPath } from './storageHelpers';

const BUCKET_CANDIDATES = ['shared-documents', 'shared_documents'];

export async function copyDocumentToShared({ cabinetId, documentId }: { cabinetId: string; documentId: string; sharedId?: string | number | null; itemName?: string | null; }): Promise<{ uploadedBucket: string | null; publicUrl: string | null }> {
  // Sharing subsystem has been disabled. Return a safe no-op result so callers
  // that expect an object won't fail. Keep the function async to preserve
  // call-site behavior.
  console.warn('copyDocumentToShared: sharing disabled by configuration. No action taken.');
  return { uploadedBucket: null, publicUrl: null };
}

export async function copyClientFileToShared({ cabinetId, clientId }: { cabinetId: string; clientId: string; storagePath?: string; itemName?: string | null; }): Promise<{ uploadedBucket: string | null; publicUrl: string | null }> {
  // Sharing disabled: return no-op result.
  console.warn('copyClientFileToShared: sharing disabled by configuration. No action taken.');
  return { uploadedBucket: null, publicUrl: null };
}
