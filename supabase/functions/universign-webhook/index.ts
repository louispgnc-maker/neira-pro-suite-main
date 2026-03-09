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
    const body = await req.json();
    console.log('[Universign Webhook] Received:', JSON.stringify(body, null, 2));

    const { id: transactionId, status, documents } = body;

    if (!transactionId) {
      console.error('[Universign Webhook] No transaction ID');
      return new Response(
        JSON.stringify({ error: 'No transaction ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Update signature status
    const { data: signature, error: sigError } = await supabase
      .from('signatures')
      .select('*')
      .or(`transaction_id.eq.${transactionId},universign_transaction_id.eq.${transactionId}`)
      .single();

    if (sigError || !signature) {
      console.error('[Universign Webhook] Signature not found for transaction:', transactionId, sigError);
      return new Response(
        JSON.stringify({ error: 'Signature not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Universign Webhook] Found signature:', signature.id, 'current status:', signature.status);

    // Map Universign status to our status
    let newStatus = 'pending';
    if (status === 'completed' || status === 'finished') {
      newStatus = 'signed';
    } else if (status === 'canceled' || status === 'expired') {
      newStatus = 'cancelled';
    } else if (status === 'failed') {
      newStatus = 'failed';
    }

    console.log('[Universign Webhook] Status:', status, '-> mapped to:', newStatus);

    // Update signature record
    const { error: updateError } = await supabase
      .from('signatures')
      .update({
        status: newStatus,
        signed_at: newStatus === 'signed' ? new Date().toISOString() : null
      })
      .eq('id', signature.id);

    if (updateError) {
      console.error('[Universign Webhook] Update error:', updateError);
    }

    // Update individual signer status if we have participant info
    if (body.participants && signature.signatories) {
      const updatedSignatories = signature.signatories.map((signer: any, index: number) => {
        const participant = body.participants.find((p: any) => p.email === signer.email);
        if (participant) {
          return {
            ...signer,
            status: participant.status === 'completed' ? 'signed' : participant.status || 'pending'
          };
        }
        return signer;
      });

      await supabase
        .from('signatures')
        .update({ signatories: updatedSignatories })
        .eq('id', signature.id);

      console.log('[Universign Webhook] Updated individual signer statuses');
    }

    // If completed, download and save the signed document
    if (newStatus === 'signed' && documents && documents.length > 0) {
      console.log('[Universign Webhook] Document signed, downloading...');

      const universignApiUrl = Deno.env.get('UNIVERSIGN_API_URL') || 'https://api.alpha.universign.com';
      const universignApiKey = Deno.env.get('UNIVERSIGN_API_KEY');
      const universignUsername = Deno.env.get('UNIVERSIGN_USERNAME');
      const universignPassword = Deno.env.get('UNIVERSIGN_PASSWORD');

      // Prepare authorization headers
      const headers: Record<string, string> = {};
      if (universignApiKey) {
        headers['Authorization'] = `Bearer ${universignApiKey}`;
      } else if (universignUsername && universignPassword) {
        const credentials = btoa(`${universignUsername}:${universignPassword}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }

      // Download signed document
      const documentId = documents[0].id;
      const downloadUrl = `${universignApiUrl}/v1/documents/${documentId}/download`;
      
      console.log('[Universign Webhook] Downloading from:', downloadUrl);

      const downloadResponse = await fetch(downloadUrl, {
        method: 'GET',
        headers
      });

      if (!downloadResponse.ok) {
        const errorText = await downloadResponse.text();
        console.error('[Universign Webhook] Download failed:', errorText);
      } else {
        const signedPdfBlob = await downloadResponse.blob();
        console.log('[Universign Webhook] Downloaded signed PDF, size:', signedPdfBlob.size);

        // Upload to Storage
        const timestamp = Date.now();
        const fileName = `signed/${signature.document_id}_${timestamp}.pdf`;
        
        console.log('[Universign Webhook] Uploading to Storage:', fileName);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, signedPdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (uploadError) {
          console.error('[Universign Webhook] Upload error:', uploadError);
        } else {
          console.log('[Universign Webhook] Signed document uploaded:', fileName);

          // Update signature record with signed document path
          const { error: sigUpdateError } = await supabase
            .from('signatures')
            .update({
              signed_document_path: fileName
            })
            .eq('id', signature.id);

          if (sigUpdateError) {
            console.error('[Universign Webhook] Signature update error:', sigUpdateError);
          }

          // Update document record with signed version
          if (signature.document_id) {
            const { error: docUpdateError } = await supabase
              .from('documents')
              .update({
                storage_path: fileName,
                signed_at: new Date().toISOString()
              })
              .eq('id', signature.document_id);

            if (docUpdateError) {
              console.error('[Universign Webhook] Document update error:', docUpdateError);
            } else {
              console.log('[Universign Webhook] Document updated with signed version');
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Universign Webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
