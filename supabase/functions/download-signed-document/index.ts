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

    // Get transaction details to find document IDs
    console.log('[Download Signed] Getting transaction:', transactionId);
    const transactionUrl = `${universignApiUrl}/v1/transactions/${transactionId}`;
    const transactionResponse = await fetch(transactionUrl, {
      method: 'GET',
      headers
    });

    if (!transactionResponse.ok) {
      const errorText = await transactionResponse.text();
      console.error('[Download Signed] Error getting transaction:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get transaction from Universign' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transaction = await transactionResponse.json();
    console.log('[Download Signed] Transaction:', transaction);

    if (!transaction.documents || transaction.documents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No documents found in transaction' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the first document (signed)
    const documentId = transaction.documents[0].id;
    console.log('[Download Signed] Downloading document:', documentId);
    
    const downloadUrl = `${universignApiUrl}/v1/documents/${documentId}/download`;
    const downloadResponse = await fetch(downloadUrl, {
      method: 'GET',
      headers
    });

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text();
      console.error('[Download Signed] Download failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to download signed document' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the PDF blob
    const pdfBlob = await downloadResponse.blob();
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const pdfBase64 = btoa(binaryString);

    console.log('[Download Signed] Document downloaded, size:', pdfBase64.length);

    return new Response(
      JSON.stringify({ 
        success: true,
        pdfBase64,
        filename: transaction.documents[0].name || 'document_signe.pdf'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Download Signed] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
