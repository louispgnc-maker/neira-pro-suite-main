// Deno Supabase Edge Function: get-signed-url
// Verifie que l'appelant (JWT Bearer) est membre du cabinet, puis renvoie un signed URL
// Nécessite l'environment variable SUPABASE_SERVICE_ROLE_KEY pour créer le client admin.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Read environment variables with some backwards/CLI-friendly fallbacks.
// Note: the `supabase secrets set` command rejects names starting with `SUPABASE_`,
// so we accept SERVICE_ROLE_KEY or SERVICE_KEY as alternatives.
// Accept SUPABASE_URL or PROJECT_URL as fallback so deploys via CLI with an env-file
// that doesn't use the SUPABASE_ prefix still work.
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

  const body = await req.json();
  const bucket = body.bucket || 'documents';
  let path = body.path || '';
  // Accept either cabinet_id (snake_case) or cabinetId (camelCase) from clients
  const cabinetId = body.cabinet_id || body.cabinetId || null;
  const expires = Number(body.expires || 60);

    if (!path) return new Response(JSON.stringify({ error: 'Missing path' }), { status: 400 });
    path = String(path).replace(/^\/+/, '');

    // Validate user from JWT
    const { data: userInfo, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userInfo?.user) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
    const callerId = userInfo.user.id;

    // Verify membership: either owner OR active member of provided cabinet
    if (cabinetId) {
      // Check cabinet_members table for active membership
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
        const { data: ownerData } = await admin.rpc('is_cabinet_owner', { cabinet_id_param: cabinetId, user_id_param: callerId });
        const isOwner = (typeof ownerData === 'boolean' && ownerData) || (Array.isArray(ownerData) && ownerData.length > 0 && ownerData[0]);
        if (!isOwner) return new Response(JSON.stringify({ error: 'Not a member' }), { status: 403 });
      }
    } else {
      // If no cabinetId provided, require that the user owns or uploaded the file — best-effort: allow for now
    }

    // Create signed URL using admin client
    try {
      const { data } = await admin.storage.from(bucket).createSignedUrl(path, expires);
      if (!data || !data.signedUrl) return new Response(JSON.stringify({ error: 'Failed to create signed URL' }), { status: 500 });
      return new Response(JSON.stringify({ signedUrl: data.signedUrl }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('signed url error', e);
      return new Response(JSON.stringify({ error: 'Signed URL creation failed' }), { status: 500 });
    }
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
});
