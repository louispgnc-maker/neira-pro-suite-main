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
      
      // Upload le PDF dans Storage pour obtenir une URL publique
      const fileName = `contracts/${contrat.id}_${Date.now()}.pdf`;
      console.log('[Universign] Uploading contract PDF to Storage:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, fileData, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error('[Universign] Storage upload error:', uploadError);
        return new Response(
          JSON.stringify({ error: 'Failed to upload PDF to storage', details: uploadError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      documentUrl = publicUrl;
      console.log('[Universign] Contract PDF uploaded, public URL:', documentUrl);

    } else if (itemType === 'dossier') {
      // Récupérer le dossier et son contrat associé
      const { data: dossier, error: dossierError } = await supabase
        .from('dossiers')
        .select('*')
        .eq('id', itemId)
        .single();

      if (dossierError || !dossier) {
        return new Response(
          JSON.stringify({ error: 'Dossier not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      documentName = dossier.nom || 'Dossier';
      ownerId = dossier.owner_id;
      role = dossier.role || 'avocat';

      // Chercher le contrat associé
      const { data: dossierContrat, error: dcError } = await supabase
        .from('dossier_contrats')
        .select('contrat_id')
        .eq('dossier_id', itemId)
        .single();

      if (dcError || !dossierContrat) {
        return new Response(
          JSON.stringify({ error: 'No contract associated with this dossier' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Récupérer le contrat
      const { data: contrat, error: contratError } = await supabase
        .from('contrats')
        .select('*')
        .eq('id', dossierContrat.contrat_id)
        .single();

      if (contratError || !contrat) {
        return new Response(
          JSON.stringify({ error: 'Contract not found for this dossier' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Générer le PDF du contrat
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

      const pdfResult = await pdfResponse.json();
      if (!pdfResult.success || !pdfResult.pdf) {
        console.error('[Universign] PDF result invalid:', pdfResult);
        return new Response(
          JSON.stringify({ error: 'PDF generation returned invalid data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Convertir base64 en Uint8Array
      const binaryString2 = atob(pdfResult.pdf);
      const bytes2 = new Uint8Array(binaryString2.length);
      for (let i = 0; i < binaryString2.length; i++) {
        bytes2[i] = binaryString2.charCodeAt(i);
      }
      
      fileData = new Blob([bytes2], { type: 'application/pdf' });
      
      // Upload le PDF dans Storage
      const fileName = `dossiers/${dossier.id}_${Date.now()}.pdf`;
      console.log('[Universign] Uploading dossier PDF to Storage:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, fileData, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error('[Universign] Storage upload error:', uploadError);
        return new Response(
          JSON.stringify({ error: 'Failed to upload PDF to storage', details: uploadError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      documentUrl = publicUrl;
      console.log('[Universign] Dossier PDF uploaded, public URL:', documentUrl);
    }

    if (!documentUrl) {
      return new Response(
        JSON.stringify({ error: 'No document URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify document URL is accessible
    console.log('[Universign] Verifying document URL accessibility:', documentUrl);
    try {
      const testResponse = await fetch(documentUrl, { method: 'HEAD' });
      console.log('[Universign] Document URL test status:', testResponse.status);
      if (!testResponse.ok) {
        console.error('[Universign] Document URL not accessible:', testResponse.status);
        return new Response(
          JSON.stringify({ 
            error: 'Document URL not accessible', 
            url: documentUrl,
            status: testResponse.status 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (urlError: any) {
      console.error('[Universign] Error testing document URL:', urlError.message);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to verify document URL', 
          url: documentUrl,
          details: urlError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const universignApiUrl = Deno.env.get('UNIVERSIGN_API_URL') || 'https://api.alpha.universign.com';
    const universignApiKey = Deno.env.get('UNIVERSIGN_API_KEY');
    const universignUsername = Deno.env.get('UNIVERSIGN_USERNAME');
    const universignPassword = Deno.env.get('UNIVERSIGN_PASSWORD');
    const siteUrl = Deno.env.get('SITE_URL') || 'https://neira.fr';

    // Check if we have either API key or username/password
    if (!universignApiKey && (!universignUsername || !universignPassword)) {
      return new Response(
        JSON.stringify({ 
          error: 'Universign credentials not configured',
          details: 'Please set either UNIVERSIGN_API_KEY or UNIVERSIGN_USERNAME + UNIVERSIGN_PASSWORD'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firstSigner = signatories[0];
    
    // Create full transaction with Universign API v1 (JSON format)
    console.log('[Universign] Creating full transaction with document URL...');
    
    // Universign API v1 - full transaction format with JSON
    const transactionRequest = {
      autostart: true,
      name: documentName,
      language: 'fr',
      duration: 15500,
      private: false,
      metadata: {
        itemType: itemType,
        itemId: itemId,
        documentName: documentName
      },
      documents: [{
        name: `${documentName}.pdf`,
        url: documentUrl,
        fields: [{
          id: 'signature_field_1',
          name: 'Signature',
          page: 1,
          x: 150,
          y: 275,
          type: 'signature',
          consents: ['Je certifie avoir lu et accepté ce document']
        }]
      }],
      signatures: [{
        field: 'signature_field_1',
        signer: firstSigner.email
      }],
      participants: [{
        email: firstSigner.email,
        full_name: `${firstSigner.firstName} ${firstSigner.lastName}`,
        full_name_type: 'prerequisite',
        schedule: [0],
        invitation_subject: `Signature requise : ${documentName}`,
        invitation_message: `Bonjour ${firstSigner.firstName}, veuillez signer le document "${documentName}".`,
        min_signature_level: 'level1'
      }]
    };

    console.log('[Universign] Transaction request:', JSON.stringify(transactionRequest, null, 2));

    // Prepare authorization headers with JSON content-type
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (universignApiKey) {
      // Use Bearer token authentication
      headers['Authorization'] = `Bearer ${universignApiKey}`;
      console.log('[Universign] Using API Key authentication');
    } else if (universignUsername && universignPassword) {
      // Use HTTP Basic authentication
      const credentials = btoa(`${universignUsername}:${universignPassword}`);
      headers['Authorization'] = `Basic ${credentials}`;
      console.log('[Universign] Using Basic authentication');
    }

    // Create full transaction (autostart = true)
    const endpoint = `${universignApiUrl}/v1/transactions/full`;
    console.log('[Universign] API URL:', universignApiUrl);
    console.log('[Universign] Request endpoint:', endpoint);
    console.log('[Universign] Auth header:', headers['Authorization']?.substring(0, 20) + '...');
    console.log('[Universign] Request body:', JSON.stringify(transactionRequest, null, 2));
    
    const createTxResponse = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(transactionRequest)
    });

    console.log('[Universign] Response status:', createTxResponse.status);
    console.log('[Universign] Response headers:', JSON.stringify(Object.fromEntries(createTxResponse.headers.entries())));

    if (!createTxResponse.ok) {
      const errorText = await createTxResponse.text();
      console.error('[Universign] Transaction creation failed');
      console.error('[Universign] Status:', createTxResponse.status);
      console.error('[Universign] Error response:', errorText);
      console.error('[Universign] Request was:', JSON.stringify(transactionRequest, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create transaction', 
          status: createTxResponse.status,
          details: errorText,
          endpoint: universignApiUrl,
          hint: createTxResponse.status === 401 ? 'Vérifiez vos identifiants Universign (API Key ou Username/Password)' : null
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transaction = await createTxResponse.json();
    console.log('[Universign] Transaction response:', JSON.stringify(transaction, null, 2));
    
    // Full API returns the transaction object directly with autostart
    const transactionId = transaction.id;
    
    console.log('[Universign] Transaction created and started successfully');
    console.log('[Universign] Transaction ID:', transactionId);

    if (!transactionId) {
      console.error('[Universign] No transaction ID in response');
      return new Response(
        JSON.stringify({ 
          error: 'No transaction ID returned from Universign',
          response: transaction 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the signature URL from participants
    const signatureUrl = transaction.participants?.[0]?.url || transaction.url || null;
    
    console.log('[Universign] Signature URL:', signatureUrl);

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
