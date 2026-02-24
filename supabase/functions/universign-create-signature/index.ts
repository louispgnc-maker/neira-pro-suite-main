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
    
    // Créer une transaction complète avec l'URL du document
    console.log('[Universign] Creating full transaction with document URL...');
    
    const fullTransactionPayload = {
      autostart: true,
      name: documentName,
      language: 'fr',
      documents: [{
        url: documentUrl,
        name: `${documentName}.pdf`,
        fields: [{
          id: 'field_signature_1',
          name: 'signature field',
          page: 1,
          x: 150,
          y: 275,
          type: 'signature'
        }]
      }],
      signatures: [{
        field: 'field_signature_1',
        signer: firstSigner.email
      }],
      participants: [{
        email: firstSigner.email,
        schedule: [0],
        full_name: `${firstSigner.firstName} ${firstSigner.lastName}`,
        full_name_type: 'prerequisite',
        invitation_subject: 'Demande de signature',
        invitation_message: 'Veuillez signer le document ci-joint.',
        min_signature_level: 'level1',
        invitation_redirect_url: `${siteUrl}/signatures`
      }]
    };

    console.log('[Universign] Transaction payload:', JSON.stringify(fullTransactionPayload, null, 2));

    const createTxResponse = await fetch(`${universignApiUrl}/transactions/full`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${universignApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fullTransactionPayload)
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
    const signatureUrl = transaction.actions?.[0]?.url || null;
    
    console.log('[Universign] Transaction created successfully');
    console.log('[Universign] Transaction ID:', transactionId);
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
