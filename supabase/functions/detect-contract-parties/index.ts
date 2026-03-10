import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();

    if (!content) {
      throw new Error('Le contenu du contrat est requis');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY non configurée');
    }

    // Limiter à 5000 premiers caractères pour l'analyse
    const contentSample = content.substring(0, 5000);

    // Appel à OpenAI pour détecter les parties
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert juridique spécialisé dans l'analyse de contrats.

Ta mission : identifier UNIQUEMENT les parties contractantes (les signataires) dans le contrat fourni.

RÈGLES IMPORTANTES :
- Ne retourne QUE les noms de rôles des parties contractantes (ex: "Franchiseur", "Franchisé", "Vendeur", "Acheteur")
- ENLÈVE tous les déterminants : "le/la/l'" (ex: "le Vendeur" → "Vendeur")
- Capitalise la première lettre
- Maximum 5 parties
- Si aucune partie claire, retourne un tableau vide

EXEMPLES :
- "dénommée le Franchiseur" → ["Franchiseur"]
- "D'une part, le Vendeur, et d'autre part, l'Acheteur" → ["Vendeur", "Acheteur"]
- "le Bailleur et le Locataire" → ["Bailleur", "Locataire"]

Réponds UNIQUEMENT avec un JSON : {"parties": ["Partie1", "Partie2"]}`
          },
          {
            role: 'user',
            content: `Analyse ce contrat et identifie les parties contractantes:\n\n${contentSample}`
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.choices[0]?.message?.content;
    
    if (!resultText) {
      throw new Error('Pas de réponse de l\'IA');
    }

    // Parser le JSON retourné
    const result = JSON.parse(resultText);
    const parties = result.parties || [];

    console.log('Parties détectées par IA:', parties);

    return new Response(
      JSON.stringify({ parties }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message, parties: [] }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Retourner 200 même en cas d'erreur pour permettre le fallback
      }
    );
  }
});
