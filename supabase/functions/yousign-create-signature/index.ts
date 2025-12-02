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
    const { documentId, signatories, signatureLevel = 'simple' } = await req.json();

    if (!documentId || !signatories || signatories.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Document ID and signatories required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map signature level to YouSign format
    const yousignSignatureLevel = signatureLevel === 'qualified' ? 'electronic_signature_with_qualified_certificate' 
      : signatureLevel === 'advanced' ? 'electronic_signature' 
      : 'electronic_signature';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get document info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, owner:owner_id(*)')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: 'Failed to download document' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert file to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64File = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Create signature request with YouSign
    const yousignApiKey = Deno.env.get('YOUSIGN_API_KEY');
    
    const signatureRequest = {
      name: document.nom,
      delivery_mode: 'email',
      timezone: 'Europe/Paris',
      documents: [{
        name: document.nom,
        nature: 'signable_document',
        content: base64File,
        parse_anchors: true
      }],
      signers: signatories.map((signer: any, index: number) => ({
        info: {
          first_name: signer.firstName,
          last_name: signer.lastName,
          email: signer.email,
          phone_number: signer.phone || '',
          locale: 'fr'
        },
        signature_level: yousignSignatureLevel,
        signature_authentication_mode: signatureLevel === 'simple' ? 'no_otp' : 'otp_email',
        fields: [{
          document_id: 0,
          type: 'signature',
          page: 1,
          x: 100,
          y: 100 + (index * 100),
          width: 200,
          height: 50
        }]
      }))
    };

    const yousignResponse = await fetch('https://api.yousign.app/v3/signature_requests', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${yousignApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(signatureRequest)
    });

    if (!yousignResponse.ok) {
      const errorText = await yousignResponse.text();
      console.error('[YouSign] Error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create signature request', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const yousignData = await yousignResponse.json();

    // Store signature info in database
    const { error: insertError } = await supabase
      .from('signatures')
      .insert({
        document_id: documentId,
        yousign_signature_request_id: yousignData.id,
        status: 'pending',
        signatories: signatories,
        created_by: document.owner_id
      });

    if (insertError) {
      console.error('[YouSign] Database insert error:', insertError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        signatureRequestId: yousignData.id,
        signatureUrl: yousignData.signers?.[0]?.signature_link || null
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
