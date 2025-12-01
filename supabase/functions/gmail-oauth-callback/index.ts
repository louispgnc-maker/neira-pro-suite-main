import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    console.log("Callback received:", { hasCode: !!code, hasState: !!state, error });

    // Handle OAuth denial
    if (error) {
      return Response.redirect(
        `${FRONTEND_URL}/oauth-callback?error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return Response.redirect(
        `${FRONTEND_URL}/oauth-callback?error=missing_parameters`
      );
    }

    // Create Supabase client with SERVICE ROLE KEY (no user auth needed)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate state and get user_id
    const { data: stateData, error: stateError } = await supabase
      .from("oauth_states")
      .select("user_id")
      .eq("state", state)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (stateError || !stateData) {
      console.error("Invalid state:", stateError);
      return Response.redirect(
        `${FRONTEND_URL}/oauth-callback?error=invalid_state`
      );
    }

    const userId = stateData.user_id;
    console.log("State validated for user:", userId);

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${SUPABASE_URL}/functions/v1/gmail-oauth-callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return Response.redirect(
        `${FRONTEND_URL}/oauth-callback?error=token_exchange_failed`
      );
    }

    const tokens = await tokenResponse.json();
    console.log("Tokens received:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });

    // Get user's Gmail profile
    const profileResponse = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error("Profile fetch failed:", errorText);
      return Response.redirect(
        `${FRONTEND_URL}/oauth-callback?error=profile_fetch_failed`
      );
    }

    const profile = await profileResponse.json();
    const emailAddress = profile.emailAddress;
    console.log("Profile fetched:", emailAddress);

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    console.log("Attempting to upsert account:", {
      user_id: userId,
      email: emailAddress,
      provider: "gmail",
      has_access_token: !!tokens.access_token,
      has_refresh_token: !!tokens.refresh_token,
      expires_at: expiresAt
    });

    // Store/update email account using SERVICE ROLE KEY
    const { data: account, error: upsertError } = await supabase
      .from("email_accounts")
      .upsert(
        {
          user_id: userId,
          email: emailAddress,
          provider: "gmail",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,email",
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("Account upsert error:", JSON.stringify(upsertError, null, 2));
      console.error("Error details:", {
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
        code: upsertError.code
      });
      return Response.redirect(
        `${FRONTEND_URL}/oauth-callback?error=database_error`
      );
    }

    console.log("Account saved successfully:", account.id);

    // Clean up state
    await supabase.from("oauth_states").delete().eq("state", state);

    // Redirect to oauth-callback page (popup will handle communication)
    return Response.redirect(
      `${FRONTEND_URL}/oauth-callback?success=true&email=${encodeURIComponent(emailAddress)}`
    );
  } catch (err) {
    console.error("Callback error:", err);
    return Response.redirect(
      `${FRONTEND_URL}/oauth-callback?error=server_error`
    );
  }
});
