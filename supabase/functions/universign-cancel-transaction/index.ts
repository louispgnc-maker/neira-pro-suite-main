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
      .or(`transaction_id.eq.${transactionId},universign_transaction_id.eq.${transactionId}`)
      .single();

    if (sigError || !signature) {
      return new Response(
        JSON.stringify({ error: 'Signature not found in database' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if signature can be cancelled
    if (signature.status === 'signee') {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot cancel completed signature',
          status: signature.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (signature.status === 'annulee' || signature.status === 'fermee') {
      return new Response(
        JSON.stringify({ 
          error: 'Signature already cancelled or closed',
          status: signature.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Universign API credentials
    const universignApiUrl = Deno.env.get('UNIVERSIGN_API_URL') || 'https://api.alpha.universign.com';
    const universignApiKey = Deno.env.get('UNIVERSIGN_API_KEY');
    const universignUsername = Deno.env.get('UNIVERSIGN_USERNAME');
    const universignPassword = Deno.env.get('UNIVERSIGN_PASSWORD');

    // Prepare authentication header
    const headers: Record<string, string> = {};
    
    if (universignApiKey) {
      headers['Authorization'] = `Bearer ${universignApiKey}`;
      console.log('[Universign] Using API Key authentication');
    } else if (universignUsername && universignPassword) {
      const credentials = btoa(`${universignUsername}:${universignPassword}`);
      headers['Authorization'] = `Basic ${credentials}`;
      console.log('[Universign] Using Basic authentication');
    } else {
      return new Response(
        JSON.stringify({ 
          error: 'Universign API credentials not configured',
          details: 'Please set either UNIVERSIGN_API_KEY or UNIVERSIGN_USERNAME + UNIVERSIGN_PASSWORD'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cancel transaction on Universign
    const cancelEndpoint = `${universignApiUrl}/v1/transactions/${transactionId}/cancel`;
    console.log('[Universign] Cancelling transaction:', cancelEndpoint);

    const cancelResponse = await fetch(cancelEndpoint, {
      method: 'POST',
      headers
    });

    if (!cancelResponse.ok) {
      const errorText = await cancelResponse.text();
      console.error('[Universign] Cancel error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to cancel transaction', 
          status: cancelResponse.status,
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await cancelResponse.json();
    console.log('[Universign] Transaction cancelled successfully:', result);

    // Count how many signatories actually signed before cancellation
    let signedCount = 0;
    if (signature.signatories && Array.isArray(signature.signatories)) {
      // Check transaction status to count who signed
      const statusEndpoint = `${universignApiUrl}/v1/transactions/${transactionId}`;
      try {
        const statusResponse = await fetch(statusEndpoint, { method: 'GET', headers });
        if (statusResponse.ok) {
          const transactionData = await statusResponse.json();
          // Count participants who have signed
          if (transactionData.participants && Array.isArray(transactionData.participants)) {
            signedCount = transactionData.participants.filter((p: any) => p.signed === true).length;
          }
        }
      } catch (error) {
        console.error('[Universign] Could not fetch transaction status to count signed participants:', error);
      }
    }

    console.log('[Universign] Signed count before cancellation:', signedCount);

    // Get complete transaction data with participants to update signer statuses
    let updatedSignatories = signature.signatories;
    let transactionData = null;
    
    try {
      const statusEndpoint = `${universignApiUrl}/v1/transactions/${transactionId}`;
      const statusResponse = await fetch(statusEndpoint, { method: 'GET', headers });
      
      if (statusResponse.ok) {
        transactionData = await statusResponse.json();
        console.log('[Universign] Transaction data retrieved:', JSON.stringify(transactionData, null, 2));
        
        // Update individual signer statuses
        if (transactionData.participants && signature.signatories) {
          updatedSignatories = signature.signatories.map((signer: any) => {
            const participant = transactionData.participants.find((p: any) => p.email === signer.email);
            if (participant) {
              // If they signed before closure, mark as "signe", otherwise "non_signe"
              const signerStatus = participant.signed === true ? 'signe' : 'non_signe';
              console.log(`[Universign] ${signer.email}: signed=${participant.signed} -> status=${signerStatus}`);
              return {
                ...signer,
                status: signerStatus
              };
            }
            return {
              ...signer,
              status: 'non_signe' // Default to not signed if not found
            };
          });
          console.log('[Universign] Updated signatories:', updatedSignatories);
        }
      }
    } catch (error) {
      console.error('[Universign] Could not fetch transaction status for signer updates:', error);
    }

    // Download signed document if any signatures were collected
    let signedDocumentPath = null;
    if (signedCount > 0 && transactionData && transactionData.documents && transactionData.documents.length > 0) {
      console.log('[Universign] Downloading partial signed document...');
      
      try {
        const documentId = transactionData.documents[0].id;
        const downloadUrl = `${universignApiUrl}/v1/documents/${documentId}/download`;
        
        console.log('[Universign] Downloading from:', downloadUrl);
        
        const downloadResponse = await fetch(downloadUrl, {
          method: 'GET',
          headers
        });

        if (downloadResponse.ok) {
          const signedPdfBlob = await downloadResponse.blob();
          console.log('[Universign] Downloaded partial signed PDF, size:', signedPdfBlob.size);

          // Upload to Storage
          const timestamp = Date.now();
          const fileName = `signed/${signature.id}_${timestamp}.pdf`;
          
          console.log('[Universign] Uploading to Storage:', fileName);

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, signedPdfBlob, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (uploadError) {
            console.error('[Universign] Upload error:', uploadError);
          } else {
            console.log('[Universign] Partial signed document uploaded:', fileName);
            signedDocumentPath = fileName;
          }
        } else {
          const errorText = await downloadResponse.text();
          console.error('[Universign] Download failed:', errorText);
        }
      } catch (downloadError) {
        console.error('[Universign] Error downloading signed document:', downloadError);
      }
    }

    // Update signature status in database
    const { error: updateError } = await supabase
      .from('signatures')
      .update({
        status: 'fermee',
        closed_at: new Date().toISOString(),
        signed_count: signedCount,
        signatories: updatedSignatories,
        signed_document_path: signedDocumentPath
      })
      .eq('id', signature.id);

    if (updateError) {
      console.error('[Universign] Failed to update signature status:', updateError);
      // Don't fail the request, transaction is already cancelled on Universign
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        transactionId: transactionId,
        signedCount: signedCount,
        message: 'Transaction cancelled successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Universign] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
