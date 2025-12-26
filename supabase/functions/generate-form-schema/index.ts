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
1. MINIMALISME : Ne demande QUE les informations ESSENTIELLES et LÉGALEMENT REQUISES
2. PAS DE SUPERFLU : Évite les champs optionnels ou "nice to have"
3. PERTINENCE : Adapte-toi à la description fournie par le professionnel
4. CLARTÉ : Champs avec labels clairs en français
5. VALIDATION : Marque les champs obligatoires

Structure du schéma JSON à retourner:
{
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
      "description": "Explication juridique si nécessaire"
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
- Si le contrat nécessite des pièces jointes (documents d'identité, diagnostics, etc.), ajoute des champs "file"
- Organise en sections logiques pour faciliter la saisie
- Maximum 15-20 champs pour éviter la surcharge
- Adapte-toi au contexte français et à la législation française`

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
