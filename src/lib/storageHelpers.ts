import { supabase } from './supabaseClient';

// Try to get a signed URL via an Edge Function that enforces cabinet membership.
// Falls back to client-side createSignedUrl when the function is not available.
export async function getSignedUrlForPath({ bucket = 'documents', path, cabinetId, expires = 60 }: { bucket?: string; path: string; cabinetId?: string | null; expires?: number; }) {
  const cleaned = (path || '').replace(/^\/+/, '');
  // Try the deployed Edge Function first
  try {
    const session = await supabase.auth.getSession();
    const token = session?.data?.session?.access_token;
    if (token && import.meta.env.VITE_SUPABASE_URL) {
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/,'')}/functions/v1/get-signed-url`;
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
        if (json?.signedUrl) return { signedUrl: json.signedUrl, source: 'function' };
      }
    }
  } catch (e) {
    // ignore and fallback
    console.debug('getSignedUrl function call failed, falling back to client createSignedUrl', e);
  }

  // Fallback to client createSignedUrl (may fail if RLS blocks it or bucket is private)
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(cleaned, expires);
    if (!error && data?.signedUrl) return { signedUrl: data.signedUrl, source: 'client' };
  } catch (e) {
    console.debug('client createSignedUrl failed', e);
  }

  return { signedUrl: null, source: null };
}
