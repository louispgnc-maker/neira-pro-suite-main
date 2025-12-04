import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { accountId, to, subject, body } = await req.json();
    
    if (!accountId || !to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: accountId, to, subject, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get account details with tokens
    const { data: account, error: accountError } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("id", accountId)
      .single();

    if (accountError || !account) {
      console.error("Account not found:", accountError);
      return new Response(
        JSON.stringify({ error: "Account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending email from:", account.email);

    // Create the email in RFC 2822 format with UTF-8 encoding
    const emailLines = [
      `To: ${to}`,
      `From: ${account.email}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      body
    ];
    const email = emailLines.join('\r\n');

    // Convert to UTF-8 bytes then encode to base64url
    const encoder = new TextEncoder();
    const emailBytes = encoder.encode(email);
    
    // Convert bytes to base64
    let binary = '';
    const len = emailBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(emailBytes[i]);
    }
    const base64 = btoa(binary);
    
    // Convert to base64url
    const encodedEmail = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const sendResponse = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedEmail
        })
      }
    );

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      console.error("Failed to send email:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email via Gmail API" }),
        { status: sendResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sentMessage = await sendResponse.json();
    console.log("Email sent successfully:", sentMessage.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        messageId: sentMessage.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Send email error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
