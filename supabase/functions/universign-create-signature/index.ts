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
    const { itemId, itemType = 'document', signatories, signatureLevel = 'simple' } = await req.json();

    if (!itemId || !itemType || !signatories || signatories.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Item ID, type and signatories required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let documentData: any = null;
    let fileData: Blob | null = null;
    let documentName = '';
    let ownerId = '';
    let role = 'avocat';

    // Handle different item types
    if (itemType === 'document') {
      // Get document info
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('*, owner:owner_id(*)')
        .eq('id', itemId)
        .single();

      if (docError || !document) {
        return new Response(
          JSON.stringify({ error: 'Document not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the file from storage
      const { data: file, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.storage_path);

      if (downloadError || !file) {
        return new Response(
          JSON.stringify({ error: 'Failed to download document' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      fileData = file;
      documentName = document.name;
      ownerId = document.owner_id;
      role = document.role || 'avocat';
      documentData = document;

    } else if (itemType === 'contrat' || itemType === 'dossier') {
      let contratId = itemId;

      // If dossier, get the associated contrat
      if (itemType === 'dossier') {
        const { data: dossierContrat, error: dcError } = await supabase
          .from('dossier_contrats')
          .select('contrat_id, dossiers!inner(owner_id, role)')
          .eq('dossier_id', itemId)
          .limit(1)
          .single();

        if (dcError || !dossierContrat) {
          return new Response(
            JSON.stringify({ error: 'No contract found for this dossier' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        contratId = dossierContrat.contrat_id;
        ownerId = dossierContrat.dossiers.owner_id;
        role = dossierContrat.dossiers.role || 'avocat';
      }

      // Get contrat info
      const { data: contrat, error: contratError } = await supabase
        .from('contrats')
        .select('*')
        .eq('id', contratId)
        .single();

      if (contratError || !contrat) {
        return new Response(
          JSON.stringify({ error: 'Contract not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!ownerId) {
        ownerId = contrat.owner_id;
        role = contrat.role || 'notaire';
      }

      // Convert contrat content to PDF using a PDF generation service
      // For now, we'll use a simple HTML to PDF conversion
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { text-align: center; }
            p { line-height: 1.6; }
          </style>
        </head>
        <body>
          <h1>${contrat.name}</h1>
          <div>${contrat.content || 'Contenu du contrat non disponible'}</div>
        </body>
        </html>
      `;

      // Call PDF generation API (you'll need to implement this)
      // For now, returning error as PDF generation needs to be implemented
      return new Response(
        JSON.stringify({ error: 'PDF generation for contracts not yet implemented. Please use Document type for now.' }),
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!fileData) {
      return new Response(
        JSON.stringify({ error: 'No file data available' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert file to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64File = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Universign API credentials
    const universignApiUrl = Deno.env.get('UNIVERSIGN_API_URL') || 'https://ws.universign.eu/tsa/v1';
    const universignApiKey = Deno.env.get('UNIVERSIGN_API_KEY');

    if (!universignApiKey) {
      return new Response(
        JSON.stringify({ error: 'Universign API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map signature level to Universign profile
    const profileMap: Record<string, string> = {
      'simple': 'default', // Simple electronic signature
      'advanced': 'certified', // Advanced electronic signature  
      'qualified': 'qualified' // Qualified electronic signature
    };

    // Create Universign transaction request
    const transactionRequest = {
      profile: profileMap[signatureLevel] || 'default',
      chainingMode: 'email', // Envoi email séquentiel
      documents: [{
        name: documentName,
        content: base64File,
        documentType: 'pdf'
      }],
      signers: signatories.map((signer: any, index: number) => ({
        firstname: signer.firstName,
        lastname: signer.lastName,
        emailAddress: signer.email,
        phoneNum: signer.phone || '',
        successURL: `${Deno.env.get('SITE_URL')}/signatures?status=success`,
        cancelURL: `${Deno.env.get('SITE_URL')}/signatures?status=cancelled`,
        failURL: `${Deno.env.get('SITE_URL')}/signatures?status=failed`,
        birthDate: null, // Optionnel
        language: 'fr'
      })),
      mustContactFirstSigner: true,
      finalDocSent: true,
      finalDocRequesterSent: true,
      certificateType: signatureLevel === 'qualified' ? 'certified' : 'simple',
      handwrittenSignatureMode: 1 // Mode signature manuscrite
    };

    // Call Universign API
    const universignResponse = await fetch(`${universignApiUrl}/requester/requestTransaction`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${universignApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionRequest)
    });

    if (!universignResponse.ok) {
      const errorText = await universignResponse.text();
      console.error('[Universign] Error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create signature request', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const universignData = await universignResponse.json();
    console.log('[Universign] Transaction created:', universignData);

    // Store signature info in database
    const { error: insertError } = await supabase
      .from('signatures')
      .insert({
        id: crypto.randomUUID(),
        document_id: itemType === 'document' ? itemId : null,
        universign_transaction_id: universignData.id || universignData.transactionId,
        document_name: documentName,
        signer_name: signatories.map((s: any) => `${s.firstName} ${s.lastName}`).join(', '),
        status: 'pending',
        owner_id: ownerId,
        role: role,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('[Universign] Database insert error:', insertError);
    }

    // Get signature URL for first signer
    const signatureUrl = universignData.signers?.[0]?.url || universignData.url || null;

    return new Response(
      JSON.stringify({ 
        success: true, 
        transactionId: universignData.id || universignData.transactionId,
        signatureUrl: signatureUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Universign] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
