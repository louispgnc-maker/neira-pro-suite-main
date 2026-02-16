import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsPDF } from "npm:jspdf@2.5.1";

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

    // Créer un nouveau document PDF avec jsPDF (bibliothèque pure, sans dépendance externe)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Configuration
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 20;
    const maxWidth = pageWidth - (2 * margin);
    const lineHeight = 7;
    let y = margin;
    
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
      // Nettoyer les espaces multiples
      .replace(/[ \t]+/g, ' ')
      .trim();
    
    // Diviser en paragraphes
    const paragraphs = text.split(/\n+/);
    
    // Fonction pour ajouter une nouvelle page si nécessaire
    const checkPageBreak = () => {
      if (y > pageHeight - margin - 20) {
        doc.addPage();
        y = margin;
      }
    };
    
    // Ajouter chaque paragraphe
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;
      
      // Détecter si c'est un titre (commence par des majuscules ou mots clés)
      const isTitle = /^[A-ZÉÈÊËÀÂÎÏÔÙ\s]{3,}$/.test(paragraph.trim()) || 
                      /^(ENTRE|ARTICLE|TITRE|CHAPITRE|PRÉAMBULE|IL A ÉTÉ CONVENU)/i.test(paragraph);
      
      // Définir la police
      if (isTitle) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
      }
      
      // Diviser le texte en lignes qui tiennent dans la largeur
      const lines = doc.splitTextToSize(paragraph, maxWidth);
      
      // Ajouter chaque ligne
      for (const line of lines) {
        checkPageBreak();
        doc.text(line, margin, y);
        y += lineHeight;
      }
      
      // Ajouter un espace après les titres
      if (isTitle) {
        y += 3;
      }
    }
    
    // Ajouter les numéros de page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${i} / ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
    
    // Générer le PDF en base64
    const pdfOutput = doc.output('arraybuffer');
    const base64Pdf = btoa(
      String.fromCharCode(...new Uint8Array(pdfOutput))
    );

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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
