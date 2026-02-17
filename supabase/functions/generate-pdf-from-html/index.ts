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
    const { html } = await req.json();

    if (!html) {
      return new Response(
        JSON.stringify({ error: 'HTML content required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Nettoyer le HTML et extraire le texte
    let text = html
      // Remplacer les sauts de ligne HTML par des sauts de ligne réels
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<li>/gi, '\n• ')
      .replace(/<\/li>/gi, '')
      // Supprimer toutes les autres balises HTML
      .replace(/<[^>]+>/g, '')
      // Décoder les entités HTML
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/&eacute;/g, 'é')
      .replace(/&egrave;/g, 'è')
      .replace(/&ecirc;/g, 'ê')
      .replace(/&agrave;/g, 'à')
      .replace(/&acirc;/g, 'â')
      .replace(/&icirc;/g, 'î')
      .replace(/&ocirc;/g, 'ô')
      .replace(/&ugrave;/g, 'ù')
      .replace(/&ucirc;/g, 'û')
      .replace(/&ccedil;/g, 'ç')
      // Nettoyer les espaces multiples
      .replace(/[ \t]+/g, ' ')
      .trim();

    // Créer un document PDF avec pdf-lib
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Ajouter une page
    let page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    const margin = 50;
    const maxWidth = width - 2 * margin;
    let y = height - margin;
    const lineHeight = 14;
    const titleSize = 14;
    const textSize = 11;

    // Fonction pour ajouter du texte avec gestion des sauts de page
    const addText = (text: string, fontSize: number, font: any, isBold = false) => {
      const lines = [];
      const words = text.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (textWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      
      for (const line of lines) {
        if (y < margin + lineHeight) {
          page = pdfDoc.addPage([595, 842]);
          y = height - margin;
        }
        
        page.drawText(line, {
          x: margin,
          y: y,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        y -= lineHeight;
      }
      
      // Espace après paragraphe
      y -= lineHeight * 0.3;
    };

    // Traiter chaque paragraphe
    const paragraphs = text.split(/\n+/);
    
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;
      
      // Détecter si c'est un titre
      const isTitle = /^[A-ZÉÈÊËÀÂÎÏÔÙ\s]{3,}$/.test(paragraph.trim()) || 
                      /^(ENTRE|ARTICLE|TITRE|CHAPITRE|PRÉAMBULE|IL A ÉTÉ CONVENU)/i.test(paragraph);
      
      if (isTitle) {
        addText(paragraph, titleSize, fontBold, true);
        y -= lineHeight * 0.5;
      } else {
        addText(paragraph, textSize, font, false);
      }
    }

    // Sauvegarder le PDF
    const pdfBytes = await pdfDoc.save();
    
    // Convertir en base64
    const base64Pdf = btoa(String.fromCharCode(...pdfBytes));

    return new Response(
      JSON.stringify({ 
        success: true,
        pdf: base64Pdf
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PDF Generation] Error:', error);
    console.error('[PDF Generation] Error stack:', error.stack);
    console.error('[PDF Generation] Error details:', JSON.stringify(error));
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        details: error.stack || '',
        type: error.name || 'Error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
