import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token for auth
    const supabaseClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, account_id, to, subject, body } = await req.json();

    // Handle get-auth-url action
    if (action === "get-auth-url") {
      // Create service role client to insert state
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { data: stateData, error: stateError } = await supabase
        .from("oauth_states")
        .insert({ user_id: user.id })
        .select("state")
        .single();

      if (stateError) {
        throw new Error(`State creation failed: ${stateError.message}`);
      }

      const state = stateData.state;
      const redirectUri = `${SUPABASE_URL}/functions/v1/gmail-oauth-callback`;
      const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.compose",
      ].join(" ");

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&access_type=offline` +
        `&prompt=consent` +
        `&state=${state}`;

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For other actions, get account and refresh token if needed
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: account, error: accountError } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("id", account_id)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      return new Response(JSON.stringify({ error: "Account not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if token needs refresh
    let accessToken = account.access_token;
    if (new Date(account.token_expires_at) < new Date()) {
      console.log("Refreshing token...");
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: account.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!refreshResponse.ok) {
        return new Response(JSON.stringify({ error: "Token refresh failed" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokens = await refreshResponse.json();
      accessToken = tokens.access_token;
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      await supabase
        .from("email_accounts")
        .update({ access_token: accessToken, token_expires_at: expiresAt })
        .eq("id", account_id);
    }

    // Handle sync action
    if (action === "sync") {
      const messagesResponse = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!messagesResponse.ok) {
        throw new Error("Failed to fetch messages");
      }

      const messagesData = await messagesResponse.json();
      const messages = messagesData.messages || [];

      for (const msg of messages) {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!detailResponse.ok) continue;

        const detail = await detailResponse.json();
        const headers = detail.payload.headers;
        const getHeader = (name: string) =>
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

        const bodyData = detail.payload.body?.data || detail.payload.parts?.[0]?.body?.data || "";
        const bodyText = bodyData ? atob(bodyData.replace(/-/g, "+").replace(/_/g, "/")) : "";

        await supabase.from("emails").upsert({
          account_id: account.id,
          message_id: detail.id,
          thread_id: detail.threadId,
          subject: getHeader("subject"),
          from_address: getHeader("from"),
          to_address: getHeader("to"),
          cc_address: getHeader("cc"),
          body_text: bodyText,
          body_html: bodyText,
          received_at: new Date(parseInt(detail.internalDate)).toISOString(),
          is_read: !detail.labelIds?.includes("UNREAD"),
          labels: detail.labelIds || [],
        }, { onConflict: "account_id,message_id" });
      }

      return new Response(JSON.stringify({ success: true, count: messages.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle send action
    if (action === "send") {
      const rawEmail = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "",
        body,
      ].join("\r\n");

      const encodedEmail = btoa(rawEmail).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      const sendResponse = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: encodedEmail }),
        }
      );

      if (!sendResponse.ok) {
        const errorText = await sendResponse.text();
        throw new Error(`Send failed: ${errorText}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
