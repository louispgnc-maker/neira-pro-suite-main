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

  console.log('[Download Signed] Starting request...');

  try {
    const body = await req.json();
    console.log('[Download Signed] Request body:', body);
    
    const { transactionId } = body;
    
    if (!transactionId) {
      console.error('[Download Signed] No transaction ID provided');
      return new Response(
        JSON.stringify({ error: 'Transaction ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Download Signed] Transaction ID:', transactionId);

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get signature record to find signed document path
    console.log('[Download Signed] Fetching signature from database...');
    const { data: signature, error: sigError } = await supabase
      .from('signatures')
      .select('*, documents(name)')
      .eq('transaction_id', transactionId)
      .single();

    if (sigError || !signature) {
      console.error('[Download Signed] Signature not found:', sigError);
      return new Response(
        JSON.stringify({ error: 'Signature not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Download Signed] Signature found:', signature);

    if (!signature.signed_document_path) {
      console.log('[Download Signed] Document not yet signed');
      return new Response(
        JSON.stringify({ error: 'Document not yet signed. Please wait for all signatories to complete signing.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download signed document from Storage
    console.log('[Download Signed] Downloading from Storage:', signature.signed_document_path);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(signature.signed_document_path);

    if (downloadError || !fileData) {
      console.error('[Download Signed] Storage download error:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download signed document from storage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Download Signed] File downloaded, size:', fileData.size);

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const pdfBase64 = btoa(binaryString);

    console.log('[Download Signed] Document converted to base64, size:', pdfBase64.length);

    const documentName = signature.documents?.name || 'document';
    const filename = `${documentName}_signe.pdf`;

    return new Response(
      JSON.stringify({ 
        success: true,
        pdfBase64,
        filename
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Download Signed] Error:', error);
    console.error('[Download Signed] Error stack:', error.stack);
    console.error('[Download Signed] Error message:', error.message);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
