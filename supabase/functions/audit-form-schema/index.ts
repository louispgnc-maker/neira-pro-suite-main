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
    const { schema, brief, contractType, role } = await req.json()
    
    console.log('🔍 Audit qualité pour:', contractType)
    console.log('📊 Schéma:', schema?.fields?.length, 'champs')

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY non configurée')
    }

    const systemPrompt = `Tu es un auditeur juridique expert qui vérifie la QUALITÉ et la COMPLÉTUDE des formulaires de contrats.
Ton rôle: analyser un schéma de formulaire et repérer TOUS les problèmes.

CRITÈRES D'AUDIT:

1️⃣ CHAMPS MANQUANTS
- Vérifier que TOUS les champs essentiels pour ce type de contrat sont présents
- Exemples par type de contrat:
  * Vente immobilière: adresse bien, prix, diagnostics, conditions suspensives
  * Contrat de travail: poste, rémunération, durée, lieu de travail, période d'essai
  * Bail: loyer, charges, durée, état des lieux, dépôt de garantie
  * Cession de droits: œuvre, droits cédés, territoire, durée, rémunération
  * Etc.

2️⃣ INCOHÉRENCES
- Dates: date_fin doit être > date_debut, durée cohérente
- Montants: positifs, cohérents entre eux
- Dépendances logiques: si X alors Y doit exister
- Rôles des parties: cohérents avec le type de contrat

3️⃣ VALIDATIONS MANQUANTES
- Champs obligatoires bien marqués
- Validations de format (email, téléphone, SIRET, etc.)
- Validations de cohérence (comparaisons entre champs)
- Règles métier (ex: préavis minimum légal)

4️⃣ CLAUSES SENSIBLES NON COUVERTES (CRITIQUE)
Pour CHAQUE type de contrat, vérifier ces clauses:
- ✅ Résiliation / Rupture: conditions, préavis, indemnités
- ✅ Juridiction compétente et droit applicable
- ✅ Confidentialité (si applicable)
- ✅ RGPD / Protection des données (si données personnelles)
- ✅ Pénalités de retard / Dommages-intérêts
- ✅ Force majeure
- ✅ Propriété intellectuelle (si applicable)
- ✅ Non-concurrence / Non-sollicitation (si applicable)
- ✅ Assurances et responsabilités
- ✅ Garanties

SÉVÉRITÉ:
- "bloquant": Empêche la validité légale du contrat
- "important": Réduit fortement la qualité juridique
- "mineur": Amélioration possible

CORRECTIONS AUTOMATIQUES:
Pour chaque problème, propose une correction concrète:
- "add_field": Ajouter un champ manquant (fournis le schéma complet du champ)
- "modify_field": Modifier un champ existant (fournis les modifications)
- "add_validation": Ajouter une règle de validation (fournis la règle)
- "add_clause": Ajouter une clause au contrat (note pour la génération finale)

FORMAT DE SORTIE: JSON strict
{
  "issues": [
    {
      "id": "issue_1",
      "severity": "bloquant" | "important" | "mineur",
      "category": "champ_manquant" | "incohérence" | "clause_sensible" | "validation",
      "title": "Titre court du problème",
      "description": "Description détaillée",
      "affectedFields": ["field1", "field2"],
      "suggestedFix": {
        "type": "add_field" | "modify_field" | "add_validation" | "add_clause",
        "details": { ... }
      }
    }
  ],
  "hasCriticalIssues": true/false,
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "correctedSchema": { ... schéma corrigé ... }
}

RÈGLES:
- Sois STRICT et EXHAUSTIF
- Privilégie la SÉCURITÉ JURIDIQUE
- Adapte-toi au droit français
- Si pas de problème → retourne issues: [] mais vérifie quand même tout
- Le schéma corrigé doit être COMPLET et DIRECTEMENT UTILISABLE

Retourne UNIQUEMENT le JSON, sans texte avant ou après.`

    const userPrompt = `Type de contrat: ${contractType}
Rôle: ${role === 'notaire' ? 'Notaire' : 'Avocat'}

BRIEF DU CONTRAT:
${JSON.stringify(brief, null, 2)}

SCHÉMA À AUDITER:
${JSON.stringify(schema, null, 2)}

Effectue un audit COMPLET et STRICT de ce schéma.
Retourne le rapport d'audit au format JSON avec les corrections.`

    console.log('🤖 Appel OpenAI pour audit qualité...')
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
        temperature: 0.1,  // Très bas pour cohérence maximale
        max_tokens: 8000,
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    let auditText = data.choices[0]?.message?.content || ''
    
    // Nettoyer le JSON
    auditText = auditText.trim()
    if (auditText.startsWith('```json')) {
      auditText = auditText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (auditText.startsWith('```')) {
      auditText = auditText.replace(/```\n?/g, '')
    }
    
    console.log('📄 Audit généré (premiers 500 chars):', auditText.substring(0, 500))
    
    let auditReport
    try {
      auditReport = JSON.parse(auditText)
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError)
      console.error('📄 Contenu reçu:', auditText)
      throw new Error('Format de réponse invalide de l\'IA')
    }

    // Ajouter les métadonnées
    const report = {
      timestamp: new Date().toISOString(),
      schemaVersion: '1.0',
      ...auditReport,
      // Déterminer si on doit retry
      shouldRetry: auditReport.hasCriticalIssues || 
                   auditReport.issues?.some((i: any) => i.severity === 'bloquant')
    }

    console.log('✅ Audit terminé:', {
      issuesCount: report.issues?.length || 0,
      criticalIssues: report.hasCriticalIssues,
      shouldRetry: report.shouldRetry
    })

    return new Response(
      JSON.stringify({
        success: true,
        report,
        tokensUsed: data.usage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('❌ Erreur audit:', error)
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
