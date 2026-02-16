import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Utiliser une approche basique de génération PDF sans bibliothèque externe
    // Créer un PDF simple avec PDFDocument
    const PDFDocument = (await import("npm:pdfkit@0.13.0")).default;
    const chunks: Uint8Array[] = [];
    
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });

    // Collecter les chunks
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    
    // Promesse pour attendre la fin de génération
    const pdfPromise = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(chunks));
      doc.on('error', reject);
    });

    // Ajouter le texte
    const paragraphs = text.split(/\n+/);
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      if (!paragraph.trim()) continue;
      
      // Détecter si c'est un titre
      const isTitle = /^[A-ZÉÈÊËÀÂÎÏÔÙ\s]{3,}$/.test(paragraph.trim()) || 
                      /^(ENTRE|ARTICLE|TITRE|CHAPITRE|PRÉAMBULE|IL A ÉTÉ CONVENU)/i.test(paragraph);
      
      if (isTitle) {
        doc.fontSize(14).font('Helvetica-Bold').text(paragraph, {
          align: 'left'
        });
        doc.moveDown(0.5);
      } else {
        doc.fontSize(11).font('Helvetica').text(paragraph, {
          align: 'justify'
        });
        doc.moveDown(0.3);
      }
    }

    // Finaliser le document
    doc.end();
    
    // Attendre la fin de génération
    await pdfPromise;
    
    // Concaténer tous les chunks
    const pdfBuffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      pdfBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Convertir en base64
    const base64Pdf = btoa(String.fromCharCode(...pdfBuffer));

    return new Response(
      JSON.stringify({ 
        success: true,
        pdf: base64Pdf
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PDF Generation] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
