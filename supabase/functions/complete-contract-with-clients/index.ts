import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PartyClient {
  nom: string;
  prenom: string;
  nom_naissance?: string;
  date_naissance?: string;
  lieu_naissance?: string;
  nationalite?: string;
  sexe?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  pays?: string;
  telephone?: string;
  email?: string;
  etat_civil?: string;
  situation_matrimoniale?: string;
  type_identite?: string;
  numero_identite?: string;
  date_expiration_identite?: string;
  profession?: string;
  employeur?: string;
  adresse_professionnelle?: string;
  siret?: string;
  nom_entreprise?: string;
  ville_rcs?: string;
}

interface RequestBody {
  contractContent: string;
  partiesClients: Record<string, PartyClient>; // {"Le Franchiseur": {...}, "Le Franchisé": {...}}
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { contractContent, partiesClients }: RequestBody = await req.json();

    if (!contractContent || !partiesClients) {
      return new Response(
        JSON.stringify({ error: 'contractContent et partiesClients requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY non configurée' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construire le prompt pour l'IA
    const partiesInfo = Object.entries(partiesClients)
      .map(([partyName, clientInfo]) => {
        const infos = [
          `Nom complet: ${clientInfo.prenom || ''} ${clientInfo.nom || ''}`.trim(),
          clientInfo.nom_naissance ? `Nom de naissance: ${clientInfo.nom_naissance}` : null,
          clientInfo.date_naissance ? `Date de naissance: ${clientInfo.date_naissance}` : null,
          clientInfo.lieu_naissance ? `Lieu de naissance: ${clientInfo.lieu_naissance}` : null,
          clientInfo.nationalite ? `Nationalité: ${clientInfo.nationalite}` : null,
          clientInfo.sexe ? `Sexe: ${clientInfo.sexe}` : null,
          clientInfo.adresse ? `Adresse: ${clientInfo.adresse}` : null,
          clientInfo.code_postal ? `Code postal: ${clientInfo.code_postal}` : null,
          clientInfo.ville ? `Ville: ${clientInfo.ville}` : null,
          clientInfo.pays ? `Pays: ${clientInfo.pays}` : null,
          clientInfo.telephone ? `Téléphone: ${clientInfo.telephone}` : null,
          clientInfo.email ? `Email: ${clientInfo.email}` : null,
          clientInfo.etat_civil ? `État civil: ${clientInfo.etat_civil}` : null,
          clientInfo.situation_matrimoniale ? `Situation matrimoniale: ${clientInfo.situation_matrimoniale}` : null,
          clientInfo.type_identite ? `Type d'identité: ${clientInfo.type_identite}` : null,
          clientInfo.numero_identite ? `Numéro d'identité: ${clientInfo.numero_identite}` : null,
          clientInfo.date_expiration_identite ? `Date d'expiration: ${clientInfo.date_expiration_identite}` : null,
          clientInfo.profession ? `Profession: ${clientInfo.profession}` : null,
          clientInfo.employeur ? `Employeur: ${clientInfo.employeur}` : null,
          clientInfo.adresse_professionnelle ? `Adresse professionnelle: ${clientInfo.adresse_professionnelle}` : null,
          clientInfo.siret ? `SIRET: ${clientInfo.siret}` : null,
          clientInfo.nom_entreprise ? `Nom entreprise: ${clientInfo.nom_entreprise}` : null,
          clientInfo.ville_rcs ? `Ville RCS: ${clientInfo.ville_rcs}` : null,
        ].filter(Boolean).join('\n  - ');

        return `${partyName}:\n  - ${infos}`;
      })
      .join('\n\n');

    const systemPrompt = `Tu es un assistant juridique expert. Ta mission est de compléter un contrat en remplaçant tous les "[À COMPLÉTER]" par les informations correctes des clients assignés à chaque partie.

RÈGLES STRICTES:
1. Analyse le contexte autour de chaque [À COMPLÉTER] pour comprendre quelle partie est concernée
2. Remplace uniquement par les informations disponibles de la partie concernée
3. Si une information n'existe pas pour un client, GARDE "[À COMPLÉTER]" (ne pas inventer)
4. Respecte exactement la mise en forme et la structure du contrat original
5. Ne modifie RIEN d'autre que les [À COMPLÉTER]
6. Sois cohérent: "né(e) le [DATE]", "de nationalité [NATIONALITE]", etc.

INFORMATIONS DES CLIENTS PAR PARTIE:
${partiesInfo}

Retourne UNIQUEMENT le contrat complété, sans commentaire ni explication.`;

    const userPrompt = `Voici le contrat à compléter:\n\n${contractContent}`;

    console.log('📤 Envoi à OpenAI...');
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Très déterministe pour éviter les variations
        max_tokens: 4000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('❌ Erreur OpenAI:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const openAIData = await openAIResponse.json();
    const completedContract = openAIData.choices[0].message.content.trim();

    console.log('✅ Contrat complété avec succès');

    return new Response(
      JSON.stringify({ completedContract }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('💥 Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
