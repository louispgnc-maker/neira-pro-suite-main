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

  console.log('[Migrate] Starting migration of signed documents...');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const universignApiUrl = Deno.env.get('UNIVERSIGN_API_URL') || 'https://api.alpha.universign.com';
    const universignApiKey = Deno.env.get('UNIVERSIGN_API_KEY');
    const universignUsername = Deno.env.get('UNIVERSIGN_USERNAME');
    const universignPassword = Deno.env.get('UNIVERSIGN_PASSWORD');

    // Prepare auth headers
    const headers: Record<string, string> = {};
    if (universignApiKey) {
      headers['Authorization'] = `Bearer ${universignApiKey}`;
    } else if (universignUsername && universignPassword) {
      const credentials = btoa(`${universignUsername}:${universignPassword}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // Find signatures that are signed but don't have signed_document_path
    console.log('[Migrate] Fetching signatures...');
    const { data: signatures, error } = await supabase
      .from('signatures')
      .select('id, transaction_id, document_id, status, documents(name)')
      .eq('status', 'signed')
      .is('signed_document_path', null);

    if (error) {
      console.error('[Migrate] Error fetching signatures:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch signatures', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!signatures || signatures.length === 0) {
      console.log('[Migrate] No signatures to migrate');
      return new Response(
        JSON.stringify({ success: true, message: 'No signatures to migrate', migrated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Migrate] Found ${signatures.length} signature(s)`);

    const results = [];

    for (const signature of signatures) {
      console.log(`\n[Migrate] Processing signature: ${signature.id}`);
      console.log(`[Migrate] Transaction ID: ${signature.transaction_id}`);

      try {
        // Try to get transaction info from Universign
        const transactionUrl = `${universignApiUrl}/v1/transactions/${signature.transaction_id}`;
        console.log(`[Migrate] Fetching transaction: ${transactionUrl}`);
        
        const transactionResponse = await fetch(transactionUrl, {
          method: 'GET',
          headers
        });

        if (!transactionResponse.ok) {
          const errorText = await transactionResponse.text();
          console.error(`[Migrate] Transaction fetch failed (${transactionResponse.status}):`, errorText.substring(0, 200));
          results.push({
            id: signature.id,
            success: false,
            error: `Universign API error: ${transactionResponse.status}`
          });
          continue;
        }

        const transaction = await transactionResponse.json();
        console.log('[Migrate] Transaction retrieved');

        if (!transaction.documents || transaction.documents.length === 0) {
          console.log('[Migrate] No documents in transaction');
          results.push({
            id: signature.id,
            success: false,
            error: 'No documents in transaction'
          });
          continue;
        }

        const documentId = transaction.documents[0].id;
        console.log(`[Migrate] Downloading document: ${documentId}`);

        // Download the signed document
        const downloadUrl = `${universignApiUrl}/v1/documents/${documentId}/download`;
        const downloadResponse = await fetch(downloadUrl, {
          method: 'GET',
          headers
        });

        if (!downloadResponse.ok) {
          const errorText = await downloadResponse.text();
          console.error(`[Migrate] Download failed (${downloadResponse.status}):`, errorText.substring(0, 200));
          results.push({
            id: signature.id,
            success: false,
            error: `Download failed: ${downloadResponse.status}`
          });
          continue;
        }

        const signedPdfBlob = await downloadResponse.blob();
        console.log(`[Migrate] Downloaded (${signedPdfBlob.size} bytes)`);

        // Upload to Storage
        const timestamp = Date.now();
        const fileName = `signed/${signature.document_id || signature.id}_${timestamp}.pdf`;

        console.log(`[Migrate] Uploading to Storage: ${fileName}`);
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, signedPdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (uploadError) {
          console.error('[Migrate] Upload error:', uploadError);
          results.push({
            id: signature.id,
            success: false,
            error: `Upload error: ${uploadError.message}`
          });
          continue;
        }

        console.log('[Migrate] Uploaded successfully');

        // Update signature record
        const { error: updateError } = await supabase
          .from('signatures')
          .update({ signed_document_path: fileName })
          .eq('id', signature.id);

        if (updateError) {
          console.error('[Migrate] Signature update error:', updateError);
          results.push({
            id: signature.id,
            success: false,
            error: `Update error: ${updateError.message}`
          });
          continue;
        }

        console.log('[Migrate] Signature updated');

        // Update document record if exists
        if (signature.document_id) {
          await supabase
            .from('documents')
            .update({
              storage_path: fileName,
              signed_at: new Date().toISOString()
            })
            .eq('id', signature.document_id);
        }

        console.log('[Migrate] ✅ Migration successful');
        results.push({
          id: signature.id,
          success: true,
          fileName
        });

      } catch (err: any) {
        console.error('[Migrate] Error:', err);
        results.push({
          id: signature.id,
          success: false,
          error: err.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`\n[Migrate] Completed: ${successCount}/${results.length} successful`);

    return new Response(
      JSON.stringify({
        success: true,
        total: results.length,
        migrated: successCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Migrate] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
