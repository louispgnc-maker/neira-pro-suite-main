import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const OAUTH_CONFIG = {
  clientId: Deno.env.get('OUTLOOK_CLIENT_ID') || '74658136-14ec-4630-ad9b-26e160ff0fc6',
  clientSecret: Deno.env.get('OUTLOOK_CLIENT_SECRET') || '',
  redirectUri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/outlook-oauth-callback`,
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  profileUrl: 'https://graph.microsoft.com/v1.0/me',
};

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  console.log('[Outlook OAuth] Callback received:', { code: !!code, state, error });

  // Handle OAuth denial
  if (error) {
    console.error('[Outlook OAuth] User denied access:', error);
    return new Response(
      `<html><script>window.opener.postMessage({ type: 'oauth-callback', success: false, error: 'access_denied' }, '*'); window.close();</script></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!code || !state) {
    console.error('[Outlook OAuth] Missing parameters');
    return new Response(
      `<html><script>window.opener.postMessage({ type: 'oauth-callback', success: false, error: 'missing_parameters' }, '*'); window.close();</script></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  try {
    // Parse state (contains user_id and session token)
    const stateData = JSON.parse(atob(state));
    const { user_id, session_token } = stateData;

    console.log('[Outlook OAuth] State parsed:', { user_id, hasSessionToken: !!session_token });

    // Verify session token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: `Bearer ${session_token}` }
        }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(session_token);
    if (authError || !user || user.id !== user_id) {
      console.error('[Outlook OAuth] Invalid session:', authError);
      return new Response(
        `<html><script>window.opener.postMessage({ type: 'oauth-callback', success: false, error: 'invalid_state' }, '*'); window.close();</script></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Exchange code for tokens
    console.log('[Outlook OAuth] Exchanging code for tokens...');
    const tokenResponse = await fetch(OAUTH_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: OAUTH_CONFIG.clientId,
        client_secret: OAUTH_CONFIG.clientSecret,
        code,
        redirect_uri: OAUTH_CONFIG.redirectUri,
        grant_type: 'authorization_code',
        scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Outlook OAuth] Token exchange failed:', errorText);
      return new Response(
        `<html><script>window.opener.postMessage({ type: 'oauth-callback', success: false, error: 'token_exchange_failed' }, '*'); window.close();</script></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const tokens = await tokenResponse.json();
    console.log('[Outlook OAuth] Tokens received:', { hasAccessToken: !!tokens.access_token, hasRefreshToken: !!tokens.refresh_token });

    // Get user profile
    console.log('[Outlook OAuth] Fetching user profile...');
    const profileResponse = await fetch(OAUTH_CONFIG.profileUrl, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('[Outlook OAuth] Profile fetch failed:', errorText);
      return new Response(
        `<html><script>window.opener.postMessage({ type: 'oauth-callback', success: false, error: 'profile_fetch_failed' }, '*'); window.close();</script></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const profile = await profileResponse.json();
    const email = profile.mail || profile.userPrincipalName;
    console.log('[Outlook OAuth] Profile fetched:', { email });

    // Calculate token expiration (1 hour from now)
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

    // Store in database using service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: dbError } = await supabaseAdmin
      .from('email_accounts')
      .upsert({
        user_id,
        email,
        provider: 'outlook',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        status: 'active',
      }, {
        onConflict: 'user_id,email',
      });

    if (dbError) {
      console.error('[Outlook OAuth] Database error:', dbError);
      return new Response(
        `<html><script>window.opener.postMessage({ type: 'oauth-callback', success: false, error: 'database_error' }, '*'); window.close();</script></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    console.log('[Outlook OAuth] Success! Account saved:', email);

    return new Response(
      `<html><script>window.opener.postMessage({ type: 'oauth-callback', success: true, email: '${email}' }, '*'); window.close();</script></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('[Outlook OAuth] Error:', error);
    return new Response(
      `<html><script>window.opener.postMessage({ type: 'oauth-callback', success: false, error: 'server_error' }, '*'); window.close();</script></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
});
