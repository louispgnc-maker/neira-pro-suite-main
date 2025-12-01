import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { accountId } = await req.json();

    if (!accountId) {
      return new Response(
        JSON.stringify({ error: 'Account ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get account
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      console.error('[Outlook Refresh] Account not found:', accountError);
      return new Response(
        JSON.stringify({ error: 'Account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token needs refresh
    const expiresAt = new Date(account.token_expires_at);
    const now = new Date();
    const needsRefresh = expiresAt <= now;

    if (!needsRefresh) {
      console.log('[Outlook Refresh] Token still valid');
      return new Response(
        JSON.stringify({ refreshed: false, message: 'Token still valid' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Outlook Refresh] Refreshing token...');

    // Refresh token
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('OUTLOOK_CLIENT_ID')!,
        client_secret: Deno.env.get('OUTLOOK_CLIENT_SECRET')!,
        refresh_token: account.refresh_token,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Outlook Refresh] Failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Token refresh failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokens = await tokenResponse.json();
    const newExpiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

    // Update database
    const { error: updateError } = await supabase
      .from('email_accounts')
      .update({
        access_token: tokens.access_token,
        token_expires_at: newExpiresAt,
      })
      .eq('id', accountId);

    if (updateError) {
      console.error('[Outlook Refresh] Database update failed:', updateError);
      return new Response(
        JSON.stringify({ error: 'Database update failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Outlook Refresh] Token refreshed successfully');

    return new Response(
      JSON.stringify({ refreshed: true, expiresAt: newExpiresAt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Outlook Refresh] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
