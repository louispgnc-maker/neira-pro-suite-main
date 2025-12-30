import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json()
    console.log('📦 Requête reçue:', JSON.stringify(requestBody))
    
    const { contractType, description, role } = requestBody

    console.log('📋 Génération formulaire pour:', { contractType, role })
    console.log('📝 Description:', description)

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('❌ OPENAI_API_KEY manquante')
      throw new Error('OPENAI_API_KEY non configurée')
    }
    
    console.log('✅ OPENAI_API_KEY présente:', openaiApiKey.substring(0, 10) + '...')

    // Prompt pour générer le schéma du formulaire
    const systemPrompt = `Tu es un expert juridique spécialisé dans la génération de formulaires de contrats.
Ton rôle est de créer un schéma de formulaire JSON optimal pour un type de contrat donné.

RÈGLES CRITIQUES:
1. 🎯 RÔLE DU CLIENT : Tu DOIS définir les parties possibles du contrat dans "client_roles"
   → Exemple: Compromis de vente → ["Le vendeur", "L'acquéreur"]
   → Exemple: Bail → ["Le bailleur (propriétaire)", "Le locataire"]
   → Exemple: Contrat de franchise → ["Le franchiseur", "Le franchisé"]
   → Le professionnel choisira quelle partie il représente
   → ADAPTE LES PARTIES AU TYPE DE CONTRAT DE MANIÈRE LOGIQUE ET RÉALISTE

2. ⚠️ NE PAS INCLURE de champs pour saisir les informations personnelles des parties
   → Le système gère déjà une section fixe pour le client principal
   → Tu dois UNIQUEMENT générer les champs spécifiques AU CONTRAT lui-même
   
3. 🔄 CHAMPS CONDITIONNELS : Utilise "conditional_on" pour les champs qui dépendent d'autres
   → Exemple: Si "clause_non_concurrence" = "Oui" → afficher "details_non_concurrence"
   → Format: { "field": "clause_non_concurrence", "value": "Oui" }
   → Permet des formulaires intelligents qui s'adaptent aux réponses

4. 🚫 INTERDICTION ABSOLUE : NE JAMAIS inclure de champs pour signatures, tampons, ou validation électronique

5. MINIMALISME : Ne demande QUE les informations ESSENTIELLES et LÉGALEMENT REQUISES pour LE CONTRAT

6. DOCUMENTS : Ajoute des champs "file" pour les documents importants LIÉS AU CONTRAT (diagnostics, justificatifs, annexes techniques, etc.)
   ⚠️ NE PAS demander de pièce d'identité (déjà dans la section fixe)

7. PERTINENCE : Adapte-toi à la description fournie par le professionnel

8. CLARTÉ : Champs avec labels clairs en français

9. VALIDATION : Marque les champs obligatoires

Structure du schéma JSON à retourner:
{
  "client_roles": ["Partie 1 (description)", "Partie 2 (description)"], // OBLIGATOIRE - Définir les rôles possibles du client
  "fields": [
    {
      "id": "unique_field_id",
      "label": "Libellé du champ",
      "type": "text|textarea|number|date|select|checkbox|file",
      "required": true|false,
      "placeholder": "Texte d'aide (optionnel)",
      "options": ["option1", "option2"], // Pour les select
      "multiple": true|false, // Pour les fichiers
      "accept": ".pdf,.jpg,.png", // Pour les fichiers
      "description": "Explication juridique si nécessaire",
      "conditional_on": { "field": "autre_field_id", "value": "valeur_declencheur" } // OPTIONNEL - Champ affiché conditionnellement
    }
  ],
  "sections": [
    {
      "title": "Titre de la section",
      "fields": ["field_id_1", "field_id_2"]
    }
  ]
}

Types de champs disponibles:
- text: Champ texte court
- textarea: Texte long
- number: Nombre
- date: Date
- select: Liste déroulante
- checkbox: Case à cocher
- file: Upload de fichier(s)

IMPORTANT:
- 🎯 TOUJOURS définir "client_roles" avec les parties pertinentes du contrat
- 🔄 Utilise "conditional_on" pour créer des formulaires intelligents et adaptatifs
- 🚫 NE JAMAIS inclure de champs client/parties (vendeur, acheteur, bailleur, locataire, etc.) - déjà géré par le système
- 🚫 NE JAMAIS inclure de pièce d'identité - déjà dans section fixe
- 🚫 N'INCLUS JAMAIS de champs pour : signature, paraphe, tampon, validation électronique
- ✅ CONCENTRE-TOI sur les informations SPÉCIFIQUES AU TYPE DE CONTRAT (bien immobilier, montants, durées, conditions particulières, etc.)
- 📎 Documents justificatifs liés AU CONTRAT (pas aux personnes)
- 📑 Organise en sections logiques pour faciliter la saisie
- ⚡ Maximum 15-20 champs pour éviter la surcharge
- 🇫🇷 Adapte-toi au contexte français et à la législation française
- ⚠️ Les signatures seront ajoutées APRÈS, ne t'en préoccupe PAS dans le formulaire

EXEMPLES CONCRETS de ce qu'il faut générer:

COMPROMIS DE VENTE:
{
  "client_roles": ["Le vendeur", "L'acquéreur"],
  "fields": [
    { "id": "adresse_bien", "label": "Adresse du bien", "type": "textarea", "required": true },
    { "id": "prix_vente", "label": "Prix de vente (€)", "type": "number", "required": true },
    { "id": "clause_suspensive", "label": "Clause suspensive d'obtention de prêt", "type": "select", "options": ["Oui", "Non"], "required": true },
    { "id": "details_pret", "label": "Détails du prêt", "type": "textarea", "conditional_on": { "field": "clause_suspensive", "value": "Oui" } }
  ]
}

BAIL D'HABITATION:
{
  "client_roles": ["Le bailleur (propriétaire)", "Le locataire"],
  "fields": [
    { "id": "adresse_logement", "label": "Adresse du logement", "type": "textarea", "required": true },
    { "id": "loyer_mensuel", "label": "Loyer mensuel (€)", "type": "number", "required": true },
    { "id": "meuble", "label": "Logement meublé", "type": "select", "options": ["Oui", "Non"], "required": true },
    { "id": "inventaire_meubles", "label": "Inventaire des meubles", "type": "textarea", "conditional_on": { "field": "meuble", "value": "Oui" } }
  ]
}

CONTRAT DE TRAVAIL:
{
  "client_roles": ["L'employeur", "Le salarié"],
  "fields": [
    { "id": "type_contrat", "label": "Type de contrat", "type": "select", "options": ["CDI", "CDD", "Alternance"], "required": true },
    { "id": "duree_cdd", "label": "Durée du CDD", "type": "text", "conditional_on": { "field": "type_contrat", "value": "CDD" } }
  ]
}`

    const userPrompt = `Type de contrat: ${contractType}
Rôle du professionnel: ${role === 'notaire' ? 'Notaire' : 'Avocat'}
Description/Besoin spécifique: ${description || 'Formulaire standard'}

Génère le schéma JSON du formulaire optimal pour ce contrat.
Retourne UNIQUEMENT le JSON, sans texte avant ou après.`

    // Appel à OpenAI
    console.log('🤖 Appel OpenAI avec model: gpt-4o')
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    })

    console.log('📡 Réponse OpenAI status:', response.status)
    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Erreur OpenAI:', error)
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    let generatedSchema = data.choices[0].message.content

    console.log('✅ Schéma brut reçu (200 premiers chars):', generatedSchema.substring(0, 200))

    // Nettoyer le JSON si GPT l'a entouré de markdown
    generatedSchema = generatedSchema.trim()
    
    // Supprimer les marqueurs markdown ```json et ```
    if (generatedSchema.startsWith('```json')) {
      generatedSchema = generatedSchema.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (generatedSchema.startsWith('```')) {
      generatedSchema = generatedSchema.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    generatedSchema = generatedSchema.trim()
    console.log('🧹 Schéma nettoyé (200 premiers chars):', generatedSchema.substring(0, 200))

    // Parser le JSON
    let schema
    try {
      schema = JSON.parse(generatedSchema)
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError)
      console.error('📄 Schéma complet qui a échoué:', generatedSchema)
      throw new Error('Le schéma généré n\'est pas un JSON valide')
    }

    return new Response(
      JSON.stringify({ schema }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur génération formulaire:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
