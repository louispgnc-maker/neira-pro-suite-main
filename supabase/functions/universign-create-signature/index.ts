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
    console.log('Received request body:', JSON.stringify(body, null, 2));
    
    const { itemId, itemType = 'document', signatories, signatureLevel = 'simple' } = body;
    
    console.log('Parsed values:', { itemId, itemType, signatories, signatureLevel });

    if (!itemId || !itemType || !signatories || signatories.length === 0) {
      console.error('Validation failed:', { itemId: !!itemId, itemType: !!itemType, signatories: !!signatories, signatoriesLength: signatories?.length });
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

      // Convert contrat content to PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page { margin: 2cm; }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 12pt;
              line-height: 1.6;
              color: #000;
            }
            h1 { 
              text-align: center;
              font-size: 18pt;
              margin-bottom: 30px;
              text-transform: uppercase;
            }
            .content {
              text-align: justify;
              white-space: pre-wrap;
            }
            .metadata {
              margin-top: 50px;
              font-size: 10pt;
              color: #666;
              border-top: 1px solid #ccc;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <h1>${contrat.name}</h1>
          <div class="content">${contrat.content || 'Contenu du contrat non disponible'}</div>
          <div class="metadata">
            <p>Date de création: ${new Date().toLocaleDateString('fr-FR')}</p>
            <p>Type: ${contrat.type || 'Contrat'}</p>
          </div>
        </body>
        </html>
      `;

      // Call our PDF generation function
      try {
        const pdfResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-pdf-from-html`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
            },
            body: JSON.stringify({ html: htmlContent })
          }
        );

        if (!pdfResponse.ok) {
          throw new Error('PDF generation failed');
        }

        const pdfData = await pdfResponse.json();
        
        if (!pdfData.pdf) {
          throw new Error('No PDF data returned');
        }

        // Convert base64 to Blob
        const pdfBytes = Uint8Array.from(atob(pdfData.pdf), c => c.charCodeAt(0));
        fileData = new Blob([pdfBytes], { type: 'application/pdf' });
        documentName = `${contrat.name}.pdf`;
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate PDF from contract content', details: pdfError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!fileData) {
      return new Response(
        JSON.stringify({ error: 'No file data available' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Universign API credentials (REST API v1)
    const universignApiUrl = Deno.env.get('UNIVERSIGN_API_URL') || 'https://api.universign.com/v1';
    const universignApiKey = Deno.env.get('UNIVERSIGN_API_KEY');

    if (!universignApiKey) {
      console.error('[Universign] No API key configured');
      return new Response(
        JSON.stringify({ 
          error: 'Universign API key not configured',
          details: 'Please set UNIVERSIGN_API_KEY in your environment variables'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeaders = {
      'Authorization': `Bearer ${universignApiKey}`,
      'Content-Type': 'application/json'
    };

    console.log('[Universign] Starting transaction creation...');

    // STEP 1: Create a draft transaction
    const createTransactionResponse = await fetch(`${universignApiUrl}/transactions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: documentName,
        language: 'fr'
      })
    });

    if (!createTransactionResponse.ok) {
      const errorText = await createTransactionResponse.text();
      console.error('[Universign] Failed to create transaction:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transaction = await createTransactionResponse.json();
    const transactionId = transaction.id;
    console.log('[Universign] Transaction created:', transactionId);

    // STEP 2: Upload the PDF file
    const formData = new FormData();
    formData.append('file', fileData, documentName);

    const uploadFileResponse = await fetch(`${universignApiUrl}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${universignApiKey}`
      },
      body: formData
    });

    if (!uploadFileResponse.ok) {
      const errorText = await uploadFileResponse.text();
      console.error('[Universign] Failed to upload file:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileResponse = await uploadFileResponse.json();
    const fileId = fileResponse.id;
    console.log('[Universign] File uploaded:', fileId);

    // STEP 3: Add document to transaction
    const addDocumentResponse = await fetch(`${universignApiUrl}/transactions/${transactionId}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${universignApiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `document=${fileId}`
    });

    if (!addDocumentResponse.ok) {
      const errorText = await addDocumentResponse.text();
      console.error('[Universign] Failed to add document:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to add document', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const documentResponse = await addDocumentResponse.json();
    const documentId = documentResponse.id;
    console.log('[Universign] Document added:', documentId);

    // STEP 4: Add signature field to document
    const addFieldResponse = await fetch(`${universignApiUrl}/transactions/${transactionId}/documents/${documentId}/fields`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${universignApiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'type=signature'
    });

    if (!addFieldResponse.ok) {
      const errorText = await addFieldResponse.text();
      console.error('[Universign] Failed to add field:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to add signature field', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fieldResponse = await addFieldResponse.json();
    const fieldId = fieldResponse.id;
    console.log('[Universign] Field added:', fieldId);

    // STEP 5: Assign signer to field (for each signatory)
    const firstSigner = signatories[0];
    const assignSignerResponse = await fetch(`${universignApiUrl}/transactions/${transactionId}/signatures`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${universignApiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `signer=${encodeURIComponent(firstSigner.email)}&field=${fieldId}`
    });

    if (!assignSignerResponse.ok) {
      const errorText = await assignSignerResponse.text();
      console.error('[Universign] Failed to assign signer:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to assign signer', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Universign] Signer assigned to field');

    // STEP 6: Activate notification for signer
    const activateNotificationResponse = await fetch(`${universignApiUrl}/transactions/${transactionId}/participants`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${universignApiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `email=${encodeURIComponent(firstSigner.email)}&schedule=[0]`
    });

    if (!activateNotificationResponse.ok) {
      const errorText = await activateNotificationResponse.text();
      console.error('[Universign] Failed to activate notification:', errorText);
      // Non-bloquant, on continue
    } else {
      console.log('[Universign] Notification activated');
    }

    // STEP 7: Start the transaction
    const startTransactionResponse = await fetch(`${universignApiUrl}/transactions/${transactionId}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${universignApiKey}`
      }
    });

    if (!startTransactionResponse.ok) {
      const errorText = await startTransactionResponse.text();
      console.error('[Universign] Failed to start transaction:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to start transaction', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startedTransaction = await startTransactionResponse.json();
    console.log('[Universign] Transaction started:', startedTransaction);

    // Get signature URL from the response
    const signatureUrl = startedTransaction.actions?.[0]?.url || null;

    // Get signature URL from the response
    const signatureUrl = startedTransaction.actions?.[0]?.url || null;

    // Store signature info in database
    const { error: insertError } = await supabase
      .from('signatures')
      .insert({
        id: crypto.randomUUID(),
        document_id: itemType === 'document' ? itemId : null,
        universign_transaction_id: transactionId,
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        transactionId: transactionId,
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
