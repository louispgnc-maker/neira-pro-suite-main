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

    // Check if signature is completed
    if (signature.status !== 'completed') {
      return new Response(
        JSON.stringify({ 
          error: 'Document not yet signed',
          status: signature.status,
          hint: 'The signature must be completed before downloading the signed document'
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

    // Download signed document from Universign
    const downloadEndpoint = `${universignApiUrl}/v1/transactions/${transactionId}/archive/documents/download`;
    console.log('[Universign] Downloading signed document from:', downloadEndpoint);

    const downloadResponse = await fetch(downloadEndpoint, {
      method: 'GET',
      headers
    });

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text();
      console.error('[Universign] Download error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to download signed document', 
          status: downloadResponse.status,
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the PDF content
    const pdfBlob = await downloadResponse.blob();
    const pdfBuffer = await pdfBlob.arrayBuffer();
    
    console.log('[Universign] Document downloaded successfully, size:', pdfBuffer.byteLength);

    // Upload to Supabase Storage
    const fileName = `signed/${signature.id}_${Date.now()}.pdf`;
    console.log('[Universign] Uploading signed document to Storage:', fileName);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('[Universign] Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to upload signed document to storage', 
          details: uploadError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    console.log('[Universign] Signed document uploaded, public URL:', publicUrl);

    // Update signature record with signed document URL
    const { error: updateError } = await supabase
      .from('signatures')
      .update({
        signed_document_url: publicUrl,
        signed_document_path: fileName,
        completed_at: new Date().toISOString()
      })
      .eq('id', signature.id);

    if (updateError) {
      console.error('[Universign] Failed to update signature record:', updateError);
      // Don't fail the request, document is already uploaded
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        signedDocumentUrl: publicUrl,
        fileName: fileName,
        size: pdfBuffer.byteLength
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
