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
    const { transactionId } = await req.json();

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: 'Transaction ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get signature info from database
    const { data: signature, error: sigError } = await supabase
      .from('signatures')
      .select('*')
      .eq('universign_transaction_id', transactionId)
      .single();

    if (sigError || !signature) {
      return new Response(
        JSON.stringify({ error: 'Signature not found in database' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Universign API credentials
    const universignApiUrl = Deno.env.get('UNIVERSIGN_API_URL') || 'https://ws.universign.eu/tsa/v1';
    const universignApiKey = Deno.env.get('UNIVERSIGN_API_KEY');

    if (!universignApiKey) {
      return new Response(
        JSON.stringify({ error: 'Universign API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get transaction status from Universign
    const statusResponse = await fetch(
      `${universignApiUrl}/requester/getTransactionInfo`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${universignApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: transactionId })
      }
    );

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('[Universign] Status check error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get transaction status', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const statusData = await statusResponse.json();
    console.log('[Universign] Transaction status:', statusData);

    // Map Universign status to our status
    const statusMap: Record<string, string> = {
      'ready': 'pending',
      'expired': 'expired',
      'completed': 'completed',
      'canceled': 'cancelled',
      'failed': 'failed'
    };

    const newStatus = statusMap[statusData.status] || 'pending';

    // Update signature status in database
    const { error: updateError } = await supabase
      .from('signatures')
      .update({ 
        status: newStatus,
        last_reminder_at: new Date().toISOString()
      })
      .eq('id', signature.id);

    if (updateError) {
      console.error('[Universign] Database update error:', updateError);
    }

    // If completed, get the signed document
    let signedDocumentUrl = null;
    if (newStatus === 'completed' && statusData.signedDocuments?.length > 0) {
      // Download signed document from Universign
      const docResponse = await fetch(
        `${universignApiUrl}/requester/getDocuments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${universignApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id: transactionId })
        }
      );

      if (docResponse.ok) {
        const docData = await docResponse.json();
        if (docData.documents && docData.documents.length > 0) {
          // Upload signed document to Supabase Storage
          const signedDoc = docData.documents[0];
          const fileName = `signed_${signature.document_id}_${Date.now()}.pdf`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(`signed/${fileName}`, 
              Uint8Array.from(atob(signedDoc.content), c => c.charCodeAt(0)),
              { contentType: 'application/pdf' }
            );

          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage
              .from('documents')
              .getPublicUrl(`signed/${fileName}`);
            
            signedDocumentUrl = urlData.publicUrl;

            // Update signature with signed document URL
            await supabase
              .from('signatures')
              .update({ signed_document_url: signedDocumentUrl })
              .eq('id', signature.id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: newStatus,
        transactionId: transactionId,
        signedDocumentUrl: signedDocumentUrl,
        details: statusData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Universign] Check status error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
