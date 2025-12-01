import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const { accountId } = await req.json();
    
    if (!accountId) {
      return new Response(
        JSON.stringify({ error: "accountId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
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
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Syncing emails for account:", account.email);

    // Fetch messages from Gmail API (last 50 messages)
    const messagesResponse = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50",
      {
        headers: { Authorization: `Bearer ${account.access_token}` },
      }
    );

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text();
      console.error("Failed to fetch messages:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch messages from Gmail" }),
        { status: messagesResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.messages || [];

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
            headers: { Authorization: `Bearer ${account.access_token}` },
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

        // Extract body
        let bodyText = "";
        let bodyHtml = "";

        const extractBody = (part: any) => {
          if (part.mimeType === "text/plain" && part.body?.data) {
            bodyText = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          } else if (part.mimeType === "text/html" && part.body?.data) {
            bodyHtml = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          } else if (part.parts) {
            part.parts.forEach(extractBody);
          }
        };

        if (messageData.payload.parts) {
          messageData.payload.parts.forEach(extractBody);
        } else if (messageData.payload.body?.data) {
          extractBody(messageData.payload);
        }

        // Store in database
        const { error: insertError } = await supabase
          .from("emails")
          .insert({
            account_id: accountId,
            message_id: message.id,
            thread_id: messageData.threadId,
            subject: subject,
            from_address: from,
            to_address: to,
            cc_address: cc,
            body_text: bodyText,
            body_html: bodyHtml,
            received_at: new Date(date).toISOString(),
            is_read: messageData.labelIds?.includes("UNREAD") ? false : true,
            is_starred: messageData.labelIds?.includes("STARRED") || false,
            labels: messageData.labelIds || [],
          });

        if (insertError) {
          console.error("Insert error:", insertError);
        } else {
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
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
