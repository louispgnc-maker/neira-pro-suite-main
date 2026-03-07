import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

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
    console.log('[AddAnchor] Received request');
    
    const { pdfBase64, anchorPosition } = body;
    
    if (!pdfBase64 || !anchorPosition) {
      return new Response(
        JSON.stringify({ error: 'pdfBase64 and anchorPosition are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Décoder le PDF base64
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    
    // Charger le PDF avec pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Récupérer la page (par défaut page 1, index 0)
    const pageIndex = (anchorPosition.page || 1) - 1;
    const page = pdfDoc.getPages()[pageIndex];
    
    if (!page) {
      return new Response(
        JSON.stringify({ error: `Page ${anchorPosition.page} not found` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Charger une police
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Obtenir les dimensions de la page
    const { height } = page.getSize();
    
    // Coordonnées : en PDF, Y=0 est en bas, donc on inverse
    const x = anchorPosition.x || 50;
    const y = height - (anchorPosition.y || 750); // Inverser Y
    
    console.log('[AddAnchor] Adding text at:', { x, y, page: anchorPosition.page });
    
    // Ajouter le texte [SIGNER_ICI] à la position spécifiée
    page.drawText('[SIGNER_ICI]', {
      x,
      y,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
    
    // Sauvegarder le PDF modifié
    const modifiedPdfBytes = await pdfDoc.save();
    
    // Convertir en base64
    const modifiedPdfBase64 = btoa(
      Array.from(new Uint8Array(modifiedPdfBytes))
        .map(b => String.fromCharCode(b))
        .join('')
    );
    
    console.log('[AddAnchor] PDF modified successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfBase64: modifiedPdfBase64 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[AddAnchor] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
