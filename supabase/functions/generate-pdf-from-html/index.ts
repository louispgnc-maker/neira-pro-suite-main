import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

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

    // Use Puppeteer via Browserless API for PDF generation
    const browserlessApiKey = Deno.env.get('BROWSERLESS_API_KEY');
    const browserlessUrl = `https://chrome.browserless.io/pdf?token=${browserlessApiKey}`;

    if (!browserlessApiKey) {
      return new Response(
        JSON.stringify({ error: 'Browserless API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfResponse = await fetch(browserlessUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        html: html,
        options: {
          displayHeaderFooter: false,
          printBackground: true,
          format: 'A4',
          margin: {
            top: '2cm',
            right: '2cm',
            bottom: '2cm',
            left: '2cm'
          }
        }
      })
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error('[PDF Generation] Error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate PDF', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

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
