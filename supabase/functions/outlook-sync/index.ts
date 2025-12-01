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
      return new Response(
        JSON.stringify({ error: 'Account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Outlook Sync] Starting sync for:', account.email);

    // Fetch messages from Microsoft Graph API
    const messagesUrl = 'https://graph.microsoft.com/v1.0/me/messages?$top=50&$orderby=receivedDateTime desc&$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview,body,isRead,hasAttachments,categories';
    
    const response = await fetch(messagesUrl, {
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Outlook Sync] API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch emails' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const messages = data.value || [];

    console.log('[Outlook Sync] Fetched', messages.length, 'messages');

    let syncedCount = 0;

    // Store each message
    for (const msg of messages) {
      const emailData = {
        account_id: accountId,
        message_id: msg.id,
        subject: msg.subject || '(No subject)',
        from_address: msg.from?.emailAddress?.address || '',
        to_address: msg.toRecipients?.map((r: any) => r.emailAddress?.address).join(', ') || '',
        body_text: msg.bodyPreview || '',
        body_html: msg.body?.content || msg.bodyPreview || '',
        received_at: msg.receivedDateTime,
        is_read: msg.isRead || false,
        is_starred: false,
        has_attachments: msg.hasAttachments || false,
        labels: msg.categories || [],
      };

      const { error: insertError } = await supabase
        .from('emails')
        .upsert(emailData, {
          onConflict: 'account_id,message_id',
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error('[Outlook Sync] Error inserting email:', insertError);
      } else {
        syncedCount++;
      }
    }

    // Update last sync time
    await supabase
      .from('email_accounts')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', accountId);

    console.log('[Outlook Sync] Synced', syncedCount, 'messages');

    return new Response(
      JSON.stringify({ success: true, synced: syncedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Outlook Sync] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
