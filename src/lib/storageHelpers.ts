import { supabase } from './supabaseClient';

// Try to get a signed URL via an Edge Function that enforces cabinet membership.
// Falls back to client-side createSignedUrl when the function is not available.
export async function getSignedUrlForPath({ bucket = 'documents', path, cabinetId, expires = 60 }: { bucket?: string; path: string; cabinetId?: string | null; expires?: number; }) {
  const cleaned = (path || '').replace(/^\/+/, '');

  // Normalize historical bucket name variants to the canonical one to avoid
  // attempting operations on non-existing underscored buckets ("shared_documents").
  if (bucket === 'shared_documents') bucket = 'shared-documents';

  // Helper to attempt client-side signed URL for a specific bucket.
  async function tryClientBucket(b: string) {
    try {
      const { data, error } = await supabase.storage.from(b).createSignedUrl(cleaned, expires);
      if (!error && data?.signedUrl) return { signedUrl: data.signedUrl, source: 'client', bucketUsed: b } as const;
      // Some Supabase errors come back as objects; include for debugging
      if (error) console.debug(`createSignedUrl for bucket=${b} failed:`, error.message ?? error);
    } catch (e) {
      console.debug(`client createSignedUrl threw for bucket=${b}`, e);
    }
    return null;
  }

  // Try the deployed Edge Function first (this may enforce cabinet membership). Keep same behavior when available.
  try {
    const session = await supabase.auth.getSession();
    const token = session?.data?.session?.access_token;
    if (token && import.meta.env.VITE_SUPABASE_URL) {
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/,'')}/functions/v1/get-signed-url`;
      try {
        const res = await fetch(fnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ bucket, path: cleaned, cabinet_id: cabinetId || null, expires }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.signedUrl) return { signedUrl: json.signedUrl, source: 'function', bucketUsed: bucket } as const;
        } else {
          // non-ok response; log and continue to client fallback
          console.debug('get-signed-url function responded with non-ok status', res.status, await res.text().catch(() => ''));
        }
      } catch (e) {
        console.debug('getSignedUrl function call failed, falling back to client createSignedUrl', e);
      }
    }
  } catch (e) {
    // if auth.getSession unexpectedly fails, continue to client fallback
    console.debug('get session failed', e);
  }

  // Try client createSignedUrl for the provided bucket first
  const triedBuckets: string[] = [];
  const primaryAttempt = await tryClientBucket(bucket);
  triedBuckets.push(bucket);
  if (primaryAttempt) return primaryAttempt;

  // If primary bucket failed, try known shared-bucket variants used historically.
  // Prefer canonical 'shared-documents' and map legacy variants to it for diagnostics.
  const candidates = ['shared-documents', 'shared_documents'];
  for (const raw of candidates) {
    const b = raw === 'shared_documents' ? 'shared-documents' : raw;
    if (triedBuckets.includes(b)) continue;
    const attempt = await tryClientBucket(b);
    triedBuckets.push(b);
    if (attempt) return attempt;
  }

  // As a last resort, return null but include tried buckets info for better diagnostics in the UI.
  return { signedUrl: null, source: null, triedBuckets } as const;
}
