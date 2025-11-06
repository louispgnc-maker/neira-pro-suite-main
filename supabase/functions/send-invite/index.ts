// Deno Deploy - Supabase Edge Function: send-invite
// Optional email sending via Resend (set RESEND_API_KEY, FROM_EMAIL)
// Auth: Bearer access token from Supabase client; function will re-check owner via RPC/SQL when necessary

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "neira <noreply@neira.fr>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    const auth = req.headers.get('Authorization') || '';
    const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Missing bearer token' }), { status: 401 });
    }

    const { cabinet_id, email, nom } = await req.json();
    if (!cabinet_id || !email) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
    }

    // Get user from JWT
    const { data: userInfo, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userInfo?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
    }
    const callerId = userInfo.user.id;

    // Verify caller is owner of cabinet
    const { data: isOwnerRes, error: ownerErr } = await admin
      .rpc('is_cabinet_owner', { cabinet_id_param: cabinet_id, user_id_param: callerId });
    if (ownerErr || !isOwnerRes) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
    }

    // Optionally send email via Resend
    if (RESEND_API_KEY) {
      const inviteUrl = `https://neira.fr/accept?cabinet=${encodeURIComponent(cabinet_id)}&email=${encodeURIComponent(email)}`;
      const subject = `Invitation à rejoindre le cabinet Neira`;
      const html = `<p>Bonjour ${nom || ''},</p>
        <p>Vous êtes invité à rejoindre un cabinet sur Neira.</p>
        <p><a href="${inviteUrl}">Accepter l'invitation</a></p>
        <p>Si le lien ne fonctionne pas, copiez-collez l'URL suivante dans votre navigateur: ${inviteUrl}</p>`;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject,
          html
        })
      });
      if (!res.ok) {
        const txt = await res.text();
        console.warn('Resend failed', txt);
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' }});
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
});
