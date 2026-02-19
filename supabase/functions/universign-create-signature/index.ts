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
    console.log('[Universign] Received request:', JSON.stringify(body));
    
    const { itemId, itemType = 'document', signatories, signatureLevel = 'simple' } = body;
    console.log('[Universign] Parsed - itemId:', itemId, 'itemType:', itemType, 'signatories:', signatories?.length);

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

    let fileData: Blob | null = null;
    let documentName = '';
    let documentUrl = '';
    let ownerId = '';
    let role = 'avocat';

    // Handle different item types
    if (itemType === 'document') {
      console.log('[Universign] Fetching document with ID:', itemId);
      
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', itemId)
        .single();

      console.log('[Universign] Document query result:', { document, error: docError });

      if (docError || !document) {
        console.error('[Universign] Document not found:', docError);
        return new Response(
          JSON.stringify({ error: 'Document not found', details: docError?.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get public URL instead of downloading
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(document.storage_path);

      console.log('[Universign] Document public URL:', publicUrl);

      documentUrl = publicUrl;
      documentName = document.name;
      ownerId = document.owner_id;
      role = document.role || 'avocat';

    } else if (itemType === 'contrat') {
      const { data: contrat, error: contratError } = await supabase
        .from('contrats')
        .select('*')
        .eq('id', itemId)
        .single();

      if (contratError || !contrat) {
        return new Response(
          JSON.stringify({ error: 'Contract not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      documentName = contrat.name || 'Contrat';
      ownerId = contrat.owner_id;
      role = contrat.role || 'avocat';

      const generatePdfUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-pdf-from-html`;
      
      const pdfResponse = await fetch(generatePdfUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || ''
        },
        body: JSON.stringify({
          html: contrat.content || '<p>Contrat vide</p>',
          filename: `${documentName}.pdf`
        })
      });

      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text();
        console.error('[Universign] PDF generation failed:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to generate PDF', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Décoder le JSON et convertir le base64 en Blob
      const pdfResult = await pdfResponse.json();
      if (!pdfResult.success || !pdfResult.pdf) {
        console.error('[Universign] PDF result invalid:', pdfResult);
        return new Response(
          JSON.stringify({ error: 'PDF generation returned invalid data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Convertir base64 en Uint8Array
      const binaryString = atob(pdfResult.pdf);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      fileData = new Blob([bytes], { type: 'application/pdf' });
    }

    if (!documentUrl) {
      return new Response(
        JSON.stringify({ error: 'No document URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const universignApiUrl = Deno.env.get('UNIVERSIGN_API_URL') || 'https://api.universign.com/v1';
    const universignApiKey = Deno.env.get('UNIVERSIGN_API_KEY');
    const siteUrl = Deno.env.get('SITE_URL') || 'https://neira.fr';

    if (!universignApiKey) {
      return new Response(
        JSON.stringify({ error: 'Universign API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firstSigner = signatories[0];
    
    // Étape 1: Créer une transaction vide
    console.log('[Universign] Step 1: Creating transaction...');
    const createTxResponse = await fetch(`${universignApiUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${universignApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: documentName,
        language: 'fr'
      })
    });

    if (!createTxResponse.ok) {
      const errorText = await createTxResponse.text();
      console.error('[Universign] Transaction creation failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transaction = await createTxResponse.json();
    const transactionId = transaction.id;
    console.log('[Universign] Transaction created:', transactionId);

    // Étape 2: Ajouter le document à la transaction via URL
    console.log('[Universign] Step 2: Adding document via URL...');
    const addDocParams = new URLSearchParams();
    addDocParams.append('url', documentUrl);
    addDocParams.append('name', `${documentName}.pdf`);

    const addDocResponse = await fetch(`${universignApiUrl}/transactions/${transactionId}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${universignApiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: addDocParams.toString()
    });

    if (!addDocResponse.ok) {
      const errorText = await addDocResponse.text();
      console.error('[Universign] Add document failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to add document', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const documentResult = await addDocResponse.json();
    const documentId = documentResult.id;
    console.log('[Universign] Document added:', documentId);

    // Étape 3: Ajouter un champ de signature au document
    console.log('[Universign] Step 3: Adding signature field...');
    const addFieldParams = new URLSearchParams();
    addFieldParams.append('type', 'signature');

    const addFieldResponse = await fetch(`${universignApiUrl}/transactions/${transactionId}/documents/${documentId}/fields`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${universignApiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: addFieldParams.toString()
    });

    if (!addFieldResponse.ok) {
      const errorText = await addFieldResponse.text();
      console.error('[Universign] Add field failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to add signature field', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fieldResult = await addFieldResponse.json();
    const fieldId = fieldResult.id;
    console.log('[Universign] Signature field added:', fieldId);

    // Étape 4: Attribuer le signataire au champ
    console.log('[Universign] Step 4: Assigning signer to field...');
    const assignSignerParams = new URLSearchParams();
    assignSignerParams.append('signer', firstSigner.email);
    assignSignerParams.append('field', fieldId);

    const assignSignerResponse = await fetch(`${universignApiUrl}/transactions/${transactionId}/signatures`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${universignApiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: assignSignerParams.toString()
    });

    if (!assignSignerResponse.ok) {
      const errorText = await assignSignerResponse.text();
      console.error('[Universign] Assign signer failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to assign signer', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Universign] Signer assigned successfully');

    // Étape 5: Activer la notification du signataire
    console.log('[Universign] Step 5: Enabling participant notification...');
    const addParticipantParams = new URLSearchParams();
    addParticipantParams.append('email', firstSigner.email);
    addParticipantParams.append('schedule', '[0]');

    const addParticipantResponse = await fetch(`${universignApiUrl}/transactions/${transactionId}/participants`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${universignApiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: addParticipantParams.toString()
    });

    if (!addParticipantResponse.ok) {
      const errorText = await addParticipantResponse.text();
      console.error('[Universign] Add participant failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to add participant', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Universign] Participant notification enabled');

    console.log('[Universign] Participant notification enabled');

    // Étape 6: Démarrer la transaction
    console.log('[Universign] Step 6: Starting transaction...');
    const startResponse = await fetch(`${universignApiUrl}/transactions/${transactionId}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${universignApiKey}` }
    });

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      console.error('[Universign] Start failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to start transaction', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startedTransaction = await startResponse.json();
    const signatureUrl = startedTransaction.actions?.[0]?.url || null;

    const { error: insertError } = await supabase
      .from('signatures')
      .insert({
        id: crypto.randomUUID(),
        document_id: itemType === 'document' ? itemId : null,
        universign_transaction_id: transactionId,
        document_name: documentName,
        signer_name: `${firstSigner.firstName} ${firstSigner.lastName}`,
        status: 'pending',
        owner_id: ownerId,
        role: role,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('[Universign] DB error:', insertError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        transactionId,
        signatureUrl
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
