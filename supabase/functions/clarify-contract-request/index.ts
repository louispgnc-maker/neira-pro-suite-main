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

    const systemPrompt = `Tu es un juriste expert spécialisé en droit des contrats français avec 20+ ans d'expérience.
Ton rôle : analyser EXHAUSTIVEMENT une demande de contrat et identifier TOUTES les informations nécessaires.

⚖️ MÉTHODOLOGIE D'ANALYSE APPROFONDIE:

ÉTAPE 1 - QUALIFICATION JURIDIQUE:
- Identifier le type exact et la catégorie du contrat (Code civil, Code de commerce, etc.)
- Déterminer les textes de loi applicables
- Identifier les obligations légales spécifiques à ce type de contrat

ÉTAPE 2 - ANALYSE DES PARTIES:
- Qualifier les parties (personne physique/morale, professionnel/consommateur)
- Identifier les capacités juridiques requises
- Déterminer les représentants légaux si nécessaire
- Vérifier les pouvoirs de signature

ÉTAPE 3 - OBLIGATIONS LÉGALES SPÉCIFIQUES:
Pour CHAQUE type de contrat, lister TOUTES les mentions obligatoires:

• BAIL D'HABITATION (Loi ALUR):
  - Surface habitable (Loi Carrez si copropriété)
  - DPE (Diagnostic Performance Énergétique) OBLIGATOIRE
  - Montant du loyer + charges détaillées
  - Montant du dépôt de garantie (max 1 mois loyer)
  - Durée du bail (3 ans minimum si propriétaire personne physique)
  - Modalités de révision du loyer (IRL)
  - État des lieux entrée/sortie
  - Assurance habitation locataire
  - Délai de préavis (1 ou 3 mois selon zone tendue)

• COMPROMIS/VENTE IMMOBILIÈRE:
  - Prix de vente exact
  - Description précise du bien (adresse, superficie, cadastre)
  - Diagnostics obligatoires (DPE, amiante, plomb, termites, ERP, gaz, électricité, assainissement)
  - Clause suspensive obtention prêt (montant, durée, taux max)
  - Délai de rétractation 10 jours
  - Servitudes et charges de copropriété
  - Garanties (vice caché, éviction)
  - Frais de notaire et répartition

• CONTRAT DE TRAVAIL:
  - Type (CDI, CDD, alternance, intérim)
  - Durée si CDD + motif de recours
  - Qualification et classification (convention collective)
  - Rémunération brute (SMIC minimum)
  - Durée du travail (35h ou forfait jours)
  - Lieu de travail et mobilité
  - Période d'essai (max selon CCN)
  - Préavis
  - Congés payés
  - Mutuelle obligatoire
  - Clause de non-concurrence si applicable
  - Formation et entretiens professionnels

• CONTRAT DE FRANCHISE:
  - Durée minimale (souvent 5-10 ans)
  - Territoire exclusif ou non
  - Droit d'entrée (montant exact)
  - Redevances (% CA ou forfait)
  - Savoir-faire transmis (description précise)
  - Formation initiale et continue
  - Assistance technique
  - Approvisionnement exclusif ou non
  - Communication et publicité
  - Clause de non-concurrence post-contractuelle
  - DIP (Document d'Information Précontractuelle) - OBLIGATOIRE 20 jours avant signature

• CONTRAT DE PRESTATION DE SERVICES:
  - Objet précis de la prestation
  - Durée ou délais d'exécution
  - Prix ou modalités de calcul
  - Obligation de moyens ou de résultat
  - Livrables attendus
  - Conditions de paiement (acompte, échéances)
  - Clause de révision de prix
  - Garanties et assurances
  - Responsabilité et limites
  - Propriété intellectuelle
  - Confidentialité
  - Résiliation et pénalités

ÉTAPE 4 - POINTS SENSIBLES OBLIGATOIRES:
Identifier SYSTÉMATIQUEMENT:
- Clauses abusives potentielles (si B2C - Code consommation)
- Déséquilibre significatif (B2B - Code commerce art. L442-6)
- RGPD si données personnelles
- Force majeure et imprévision (réforme 2016)
- Clause résolutoire
- Clause pénale (montant manifestement excessif?)
- Juridiction compétente et loi applicable
- Médiation et modes alternatifs de résolution

ÉTAPE 5 - INFORMATIONS MANQUANTES:
Pour chaque info manquante, qualifier:
- "bloquant" = Contrat NUL sans cette info (mentions légales obligatoires)
- "important" = Risque contentieux élevé
- "optionnel" = Recommandé mais non obligatoire

ÉTAPE 6 - ANNEXES OBLIGATOIRES:
Lister TOUS les documents à joindre selon le type de contrat

FORMAT DE SORTIE: JSON EXHAUSTIF
{
  "contractType": "Type exact",
  "variant": "Variante",
  "legalFramework": {
    "codeApplicable": "Code civil/commerce/consommation/travail",
    "articlesReferences": ["Art. 1103 CC", "Art. L. 121-1 C. conso"],
    "obligationLegales": ["Liste complète des obligations légales"]
  },
  "parties": [
    { 
      "role": "Précis", 
      "description": "Détaillée",
      "qualification": "Personne physique/morale, Professionnel/Consommateur"
    }
  ],
  "context": {
    "description": "Contexte complet",
    "objectif": "Objectif principal",
    "particularites": ["Tous les points particuliers"]
  },
  "pointsSensibles": ["TOUS les points sensibles juridiques identifiés"],
  "annexesAttendues": ["TOUS les documents obligatoires"],
  "missingInfo": [
    {
      "category": "Catégorie",
      "field": "nom_champ",
      "description": "Description précise avec référence légale si applicable",
      "priority": "bloquant/important/optionnel",
      "legalReference": "Article de loi si mention obligatoire"
    }
  ],
  "providedInfo": {}
}

🎯 EXIGENCE MAXIMALE: Ne laisse AUCUNE information obligatoire dans l'ombre. Liste TOUT ce qu'un avocat chevronné demanderait.

Retourne UNIQUEMENT le JSON, sans texte avant ou après.`

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
