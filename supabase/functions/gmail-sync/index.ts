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
    const { accountId } = await req.json();
    
    if (!accountId) {
      return new Response(
        JSON.stringify({ error: "accountId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: 'public' },
      auth: { 
        persistSession: false,
        autoRefreshToken: false
      }
    });

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

    console.log("Syncing emails for account:", account.email);
    console.log("Using access token:", account.access_token?.substring(0, 20) + "...");

    let accessToken = account.access_token;

    // Fetch ALL messages from Gmail API using pagination
    let allMessages: any[] = [];
    let pageToken: string | null = null;
    let pageCount = 0;

    console.log("Starting pagination to fetch all emails...");

    do {
      pageCount++;
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=500${pageToken ? `&pageToken=${pageToken}` : ''}`;
      
      let messagesResponse = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      console.log(`Page ${pageCount} - Gmail API response status:`, messagesResponse.status);

      // If token expired (401), try to refresh it
      if (messagesResponse.status === 401) {
        console.log("Token expired, refreshing...");
        
        const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
            client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
            refresh_token: account.refresh_token,
            grant_type: "refresh_token",
          }),
        });

        if (refreshResponse.ok) {
          const tokens = await refreshResponse.json();
          const newExpiresAt = new Date(Date.now() + (tokens.expires_in * 1000));
          accessToken = tokens.access_token;

          // Update the account with new token
          await supabase
            .from("email_accounts")
            .update({
              access_token: tokens.access_token,
              token_expires_at: newExpiresAt.toISOString(),
            })
            .eq("id", accountId);

          console.log("Token refreshed successfully, retrying fetch...");

          // Retry the API call with new token
          messagesResponse = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          console.log("Retry Gmail API response status:", messagesResponse.status);
        } else {
          console.error("Token refresh failed");
          return new Response(
            JSON.stringify({ error: "Failed to refresh token" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (!messagesResponse.ok) {
        const errorText = await messagesResponse.text();
        console.error("Failed to fetch messages:", errorText);
        console.error("Response status:", messagesResponse.status);
        return new Response(
          JSON.stringify({ error: "Failed to fetch messages from Gmail", details: errorText }),
          { status: messagesResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const messagesData = await messagesResponse.json();
      const messages = messagesData.messages || [];
      
      console.log(`Page ${pageCount} - Found ${messages.length} messages`);
      allMessages = allMessages.concat(messages);
      
      pageToken = messagesData.nextPageToken || null;
      
      if (pageToken) {
        console.log(`Page ${pageCount} - Has nextPageToken, continuing pagination...`);
      }
    } while (pageToken);

    console.log(`Total messages found across ${pageCount} page(s):`, allMessages.length);

    const messages = allMessages;

    console.log(`Found ${messages.length} messages`);

    let syncedCount = 0;
    let skippedCount = 0;

    // Fetch details for each message
    for (const message of messages) {
      try {
        // Check if message already exists
        const { data: existingEmail } = await supabase
          .from("emails")
          .select("id")
          .eq("account_id", accountId)
          .eq("message_id", message.id)
          .single();

        if (existingEmail) {
          skippedCount++;
          continue;
        }

        // Fetch full message details
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!messageResponse.ok) continue;

        const messageData = await messageResponse.json();
        const headers = messageData.payload.headers;
        
        // Extract headers
        const getHeader = (name: string) => 
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

        const subject = getHeader("Subject");
        const from = getHeader("From");
        const to = getHeader("To");
        const cc = getHeader("Cc");
        const date = getHeader("Date");

        // Extract body with proper decoding
        let bodyText = "";
        let bodyHtml = "";

        const decodeBase64Url = (str: string): string => {
          try {
            // Convert base64url to base64
            const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
            // Decode base64 to bytes
            const binaryString = atob(base64);
            // Convert to Uint8Array
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            // Decode as UTF-8
            return new TextDecoder('utf-8').decode(bytes);
          } catch (e) {
            console.error("Failed to decode base64url:", e);
            return str;
          }
        };

        const decodeQuotedPrintable = (str: string): string => {
          // Decode quoted-printable encoding
          return str
            .replace(/=\r?\n/g, '') // Remove soft line breaks
            .replace(/=([0-9A-F]{2})/gi, (_, hex) => 
              String.fromCharCode(parseInt(hex, 16))
            );
        };

        const extractBody = (part: any) => {
          if (!part) return;

          const mimeType = part.mimeType || '';
          const encoding = part.headers?.find((h: any) => 
            h.name.toLowerCase() === 'content-transfer-encoding'
          )?.value?.toLowerCase() || '';

          if ((mimeType === "text/plain" || mimeType.startsWith("text/plain")) && part.body?.data) {
            let decoded = decodeBase64Url(part.body.data);
            if (encoding === 'quoted-printable') {
              decoded = decodeQuotedPrintable(decoded);
            }
            if (!bodyText) bodyText = decoded; // Keep first text/plain part
          } else if ((mimeType === "text/html" || mimeType.startsWith("text/html")) && part.body?.data) {
            let decoded = decodeBase64Url(part.body.data);
            if (encoding === 'quoted-printable') {
              decoded = decodeQuotedPrintable(decoded);
            }
            if (!bodyHtml) bodyHtml = decoded; // Keep first text/html part
          } else if (part.parts) {
            part.parts.forEach(extractBody);
          }
        };

        if (messageData.payload.parts) {
          messageData.payload.parts.forEach(extractBody);
        } else if (messageData.payload.body?.data) {
          extractBody(messageData.payload);
        }

        // If no HTML body, use text body
        if (!bodyHtml && bodyText) {
          bodyHtml = bodyText.replace(/\n/g, '<br>');
        }

        // Extract attachments metadata
        const attachments: any[] = [];
        const extractAttachments = (part: any) => {
          if (part.filename && part.body?.attachmentId) {
            attachments.push({
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body.size || 0,
              attachmentId: part.body.attachmentId
            });
          }
          if (part.parts) {
            part.parts.forEach(extractAttachments);
          }
        };
        extractAttachments(messageData.payload);

        // Store in database using RPC function (bypasses RLS)
        const { data: emailId, error: insertError } = await supabase.rpc('insert_synced_email', {
          p_account_id: accountId,
          p_message_id: message.id,
          p_thread_id: messageData.threadId,
          p_subject: subject,
          p_from_address: from,
          p_to_address: to,
          p_cc_address: cc,
          p_body_text: bodyText,
          p_body_html: bodyHtml,
          p_received_at: new Date(date).toISOString(),
          p_is_read: !messageData.labelIds?.includes("UNREAD"),
          p_is_starred: messageData.labelIds?.includes("STARRED") || false,
          p_labels: messageData.labelIds || [],
          p_attachments: attachments
        });

        if (insertError) {
          console.error("Insert error for message", message.id, ":", JSON.stringify(insertError));
          console.error("Account ID:", accountId, "Message ID:", message.id);
        } else {
          console.log("Successfully inserted message:", message.id, "with ID:", emailId);
          syncedCount++;
        }
      } catch (error) {
        console.error("Error processing message:", message.id, error);
      }
    }

    console.log(`Sync complete: ${syncedCount} new, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: syncedCount,
        skipped: skippedCount,
        total: messages.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
