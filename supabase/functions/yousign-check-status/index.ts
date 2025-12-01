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
    const { signatureRequestId } = await req.json();

    if (!signatureRequestId) {
      return new Response(
        JSON.stringify({ error: 'Signature request ID required' }),
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
      .select('*, document:document_id(*)')
      .eq('yousign_signature_request_id', signatureRequestId)
      .single();

    if (sigError || !signature) {
      return new Response(
        JSON.stringify({ error: 'Signature not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const yousignApiKey = Deno.env.get('YOUSIGN_API_KEY');

    // Get signature request status from YouSign
    const statusResponse = await fetch(
      `https://api.yousign.app/v3/signature_requests/${signatureRequestId}`,
      {
        headers: {
          'Authorization': `Bearer ${yousignApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!statusResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to get signature status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const statusData = await statusResponse.json();

    // If signature is completed, download the signed document
    if (statusData.status === 'done') {
      // Download signed document from YouSign
      const downloadResponse = await fetch(
        `https://api.yousign.app/v3/signature_requests/${signatureRequestId}/documents/download`,
        {
          headers: {
            'Authorization': `Bearer ${yousignApiKey}`
          }
        }
      );

      if (!downloadResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to download signed document' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const signedDocBlob = await downloadResponse.blob();
      const signedDocBuffer = await signedDocBlob.arrayBuffer();

      // Upload to Supabase storage, replacing the original document
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .update(signature.document.file_path, signedDocBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error('[YouSign] Upload error:', uploadError);
        return new Response(
          JSON.stringify({ error: 'Failed to upload signed document' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update signature status
      await supabase
        .from('signatures')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', signature.id);

      // Update document metadata
      await supabase
        .from('documents')
        .update({ 
          is_signed: true,
          signed_at: new Date().toISOString()
        })
        .eq('id', signature.document_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'completed',
          message: 'Document signed and updated successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update signature status in database
    await supabase
      .from('signatures')
      .update({ status: statusData.status })
      .eq('id', signature.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: statusData.status 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[YouSign] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
