import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { contractType, description, role, existingAnswers } = await req.json()
    
    console.log('📋 Clarification pour:', { contractType, role, hasExistingAnswers: !!existingAnswers })

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY non configurée')
    }

    const systemPrompt = `Tu es un expert juridique spécialisé dans l'analyse de demandes de création de contrats.
Ton rôle est de transformer une demande en texte libre en un BRIEF STRUCTURÉ exploitable.

OBJECTIFS:
1. Identifier le type/variante exact du contrat
2. Identifier les parties et leurs rôles
3. Extraire le contexte et l'objectif
4. Repérer les points sensibles juridiques
5. Lister les annexes attendues
6. SURTOUT: Identifier les informations MANQUANTES critiques

RÈGLES STRICTES:
- NE JAMAIS INVENTER d'informations
- Si une info n'est pas fournie → la marquer comme MANQUANTE
- Priorités des infos manquantes:
  * "bloquant" = impossible de créer le contrat sans ça
  * "important" = qualité réduite sans ça
  * "optionnel" = améliore le contrat mais pas indispensable

- Points sensibles OBLIGATOIRES à vérifier selon type de contrat:
  * Dates et durées (début, fin, renouvellement)
  * Montants et modalités de paiement
  * Identité complète des parties
  * Clauses de résiliation
  * Juridiction compétente
  * Confidentialité / RGPD (si applicable)
  * Pénalités / dommages-intérêts
  * Propriété intellectuelle (si applicable)

FORMAT DE SORTIE: JSON strict
{
  "contractType": "Type exact du contrat",
  "variant": "Variante si applicable (ex: CDI, CDD)",
  "parties": [
    { "role": "Le vendeur", "description": "..." },
    { "role": "L'acquéreur", "description": "..." }
  ],
  "context": {
    "description": "Résumé du contexte",
    "objectif": "Objectif principal du contrat",
    "particularites": ["point 1", "point 2"]
  },
  "pointsSensibles": [
    "Clause de résiliation",
    "Modalités de paiement",
    ...
  ],
  "annexesAttendues": ["Diagnostic technique", "Plan cadastral", ...],
  "missingInfo": [
    {
      "category": "Parties",
      "field": "identite_vendeur",
      "description": "Identité complète du vendeur (nom, prénom, adresse)",
      "priority": "bloquant"
    },
    {
      "category": "Montants",
      "field": "prix_vente",
      "description": "Prix de vente du bien",
      "priority": "bloquant"
    }
  ],
  "providedInfo": {
    "adresse_bien": "...",
    ...
  }
}

IMPORTANT: Retourne UNIQUEMENT le JSON, sans texte avant ou après.`

    const userPrompt = `Type de contrat: ${contractType}
Rôle du professionnel: ${role === 'notaire' ? 'Notaire' : 'Avocat'}
Description de la demande:
${description || 'Contrat standard'}
${existingAnswers ? `\n\nRéponses déjà fournies par le client:\n${JSON.stringify(existingAnswers, null, 2)}` : ''}

Analyse cette demande et génère le brief structuré.`

    console.log('🤖 Appel OpenAI pour clarification...')
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2,  // Bas pour cohérence
        max_tokens: 4000,
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    let briefText = data.choices[0]?.message?.content || ''
    
    // Nettoyer le JSON si nécessaire
    briefText = briefText.trim()
    if (briefText.startsWith('```json')) {
      briefText = briefText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (briefText.startsWith('```')) {
      briefText = briefText.replace(/```\n?/g, '')
    }
    
    console.log('📄 Brief généré (premiers 500 chars):', briefText.substring(0, 500))
    
    let brief
    try {
      brief = JSON.parse(briefText)
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError)
      console.error('📄 Contenu reçu:', briefText)
      throw new Error('Format de réponse invalide de l\'IA')
    }

    // Déterminer si on a besoin de plus d'infos
    const hasCriticalMissingInfo = brief.missingInfo?.some(
      (info: any) => info.priority === 'bloquant'
    ) || false

    // Générer les questions si infos manquantes
    let questions = []
    if (hasCriticalMissingInfo || brief.missingInfo?.length > 0) {
      questions = brief.missingInfo.map((info: any, index: number) => ({
        id: `q_${index}`,
        category: info.category,
        question: generateQuestionText(info),
        fieldName: info.field,
        inputType: inferInputType(info.field, info.category),
        required: info.priority === 'bloquant',
        priority: info.priority,
        hint: info.description
      }))
    }

    return new Response(
      JSON.stringify({
        success: true,
        brief,
        needsMoreInfo: hasCriticalMissingInfo || brief.missingInfo?.length > 0,
        questions,
        tokensUsed: data.usage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('❌ Erreur clarification:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

/**
 * Génère le texte de la question à partir de l'info manquante
 */
function generateQuestionText(info: any): string {
  const category = info.category
  const description = info.description
  
  // Templates de questions selon la catégorie
  const templates: Record<string, string> = {
    'Parties': `Veuillez fournir ${description.toLowerCase()}`,
    'Montants': `Quel est ${description.toLowerCase()} ?`,
    'Durée': `Quelle est ${description.toLowerCase()} ?`,
    'Dates': `Quelle est ${description.toLowerCase()} ?`,
    'Adresse': `Quelle est ${description.toLowerCase()} ?`,
    'Conditions': `Précisez ${description.toLowerCase()}`,
  }
  
  return templates[category] || description
}

/**
 * Infère le type d'input approprié selon le champ
 */
function inferInputType(field: string, category: string): string {
  if (field.includes('date') || category === 'Dates') return 'date'
  if (field.includes('montant') || field.includes('prix') || category === 'Montants') return 'number'
  if (field.includes('description') || field.includes('detail')) return 'textarea'
  if (field.includes('duree') && category === 'Durée') return 'text'
  
  return 'text'
}
