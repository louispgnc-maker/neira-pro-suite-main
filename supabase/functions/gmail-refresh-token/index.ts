import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

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
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get account with refresh token
    const { data: account, error: accountError } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("id", accountId)
      .single();

    if (accountError || !account) {
      throw new Error("Account not found");
    }

    // Check if token needs refresh (expired or about to expire)
    const now = new Date();
    const expiresAt = new Date(account.token_expires_at);
    const needsRefresh = expiresAt <= now;

    if (!needsRefresh) {
      return new Response(
        JSON.stringify({ message: "Token still valid", access_token: account.access_token }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Refresh the token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: account.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token refresh failed:', errorText);
      // Don't throw - return current token and let it retry later
      return new Response(
        JSON.stringify({ 
          message: "Token refresh failed, using existing token", 
          access_token: account.access_token,
          expires_at: account.token_expires_at,
          warning: 'refresh_failed'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokens = await tokenResponse.json();
    const newExpiresAt = new Date(now.getTime() + (tokens.expires_in * 1000));

    // Update the account with new token
    const { error: updateError } = await supabase
      .from("email_accounts")
      .update({
        access_token: tokens.access_token,
        token_expires_at: newExpiresAt.toISOString(),
      })
      .eq("id", accountId);

    if (updateError) {
      throw new Error(`Failed to update token: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        message: "Token refreshed successfully", 
        access_token: tokens.access_token,
        expires_at: newExpiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Refresh token error:", error);
    // Return 200 with warning instead of error to avoid disconnection
    return new Response(
      JSON.stringify({ 
        message: "Token refresh error, using cached token",
        warning: error.message 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
