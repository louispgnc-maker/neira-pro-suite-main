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
    
    const { pdfBase64, anchorPositions } = body;
    
    if (!pdfBase64 || !anchorPositions || !Array.isArray(anchorPositions)) {
      return new Response(
        JSON.stringify({ error: 'pdfBase64 and anchorPositions array are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Décoder le PDF base64
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    
    // Charger le PDF avec pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Charger une police
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Ajouter une ancre pour chaque signataire
    for (const anchorPos of anchorPositions) {
      // Récupérer la page (par défaut page 1, index 0)
      const pageIndex = (anchorPos.page || 1) - 1;
      const page = pdfDoc.getPages()[pageIndex];
      
      if (!page) {
        console.warn(`[AddAnchor] Page ${anchorPos.page} not found, skipping anchor for signatory ${anchorPos.signatoryIndex}`);
        continue;
      }

      // Obtenir les dimensions de la page
      const { height } = page.getSize();
      
      // Coordonnées : en PDF, Y=0 est en bas, donc on inverse
      const x = anchorPos.x || 50;
      const y = height - (anchorPos.y || 750); // Inverser Y
      
      // Créer une ancre unique pour chaque signataire
      const anchorText = `[SIGNER_ICI_${anchorPos.signatoryIndex + 1}]`;
      
      console.log('[AddAnchor] Adding anchor:', anchorText, 'at:', { x, y, page: anchorPos.page });
      
      // Ajouter le texte à la position spécifiée
      // Taille 2pt et couleur gris très clair pour être quasi invisible
      page.drawText(anchorText, {
        x,
        y,
        size: 2, // Très petite taille
        font,
        color: rgb(0.9, 0.9, 0.9), // Gris très clair (presque blanc)
      });
    }
    
    // Sauvegarder le PDF modifié
    const modifiedPdfBytes = await pdfDoc.save();
    
    // Convertir en base64
    const modifiedPdfBase64 = btoa(
      Array.from(new Uint8Array(modifiedPdfBytes))
        .map(b => String.fromCharCode(b))
        .join('')
    );
    
    console.log('[AddAnchor] PDF modified successfully with', anchorPositions.length, 'anchors');
    
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
