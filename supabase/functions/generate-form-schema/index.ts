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
    const systemPrompt = `Tu es un juriste expert avec 20+ ans d'expérience en rédaction de contrats français.
Tu dois créer un formulaire JSON EXHAUSTIF qui collecte TOUTES les informations nécessaires pour un contrat juridiquement opposable.

⚖️ MÉTHODOLOGIE RIGOUREUSE:

ÉTAPE 1 - ANALYSE DU TYPE DE CONTRAT:
- Identifier les textes de loi applicables (Code civil, Code du travail, Code de commerce, etc.)
- Lister TOUTES les mentions légalement obligatoires
- Référencer les jurisprudences importantes
- Identifier les risques de nullité

ÉTAPE 2 - CHAMPS OBLIGATOIRES PAR TYPE:

🏠 BAIL D'HABITATION (Loi n°89-462):
OBLIGATOIRE:
- Type logement (vide/meublé - impact durée bail)
- Adresse complète du bien
- Surface habitable précise (m² Loi Carrez si copropriété)
- Montant loyer mensuel hors charges
- Montant charges mensuelles (forfait ou provision avec régularisation)
- Détail des charges récupérables
- Montant dépôt de garantie (max 1 mois loyer si vide, 2 mois si meublé)
- Durée du bail (3 ans personne physique, 6 ans personne morale, 1 an meublé)
- Date d'effet du bail
- Indice de référence des loyers (IRL) pour révision
- Diagnostics joints: DPE (classe énergétique), Amiante, Plomb, Risques naturels, Gaz, Électricité
- Descriptif du logement (nombre pièces, équipements)
- Destination du local (habitation exclusive)
- Modalités règlement loyer (virement, prélèvement)
- Clause de solidarité si colocataires
- Assurance habitation locataire (obligation)

💼 CONTRAT DE TRAVAIL:
OBLIGATOIRE:
- Type contrat (CDI, CDD, alternance, intérim, contrat pro)
- Si CDD: Motif précis de recours + terme précis ou imprécis
- Poste et qualification précise
- Coefficient et classification convention collective applicable
- Salaire brut mensuel (minimum SMIC ou convention)
- Durée travail (35h, 39h, forfait jours)
- Lieu de travail principal
- Date d'embauche
- Période d'essai (durée max selon CCN) + renouvellement possible
- Préavis démission/licenciement
- Congés payés (2,5 jours ouvrables/mois)
- Mutuelle obligatoire (détails)
- Clause de mobilité géographique si applicable
- Clause de confidentialité
- Clause de non-concurrence (durée, zone, contrepartie financière)
- Formation professionnelle (entretiens annuels)
- Avantages en nature (véhicule, logement, téléphone)

🏢 CONTRAT DE FRANCHISE (Loi Doubin):
OBLIGATOIRE:
- Enseigne et marque exploitée
- Territoire d'exclusivité (précis avec plan)
- Durée du contrat (souvent 5-10 ans minimum)
- Droit d'entrée (montant exact TTC)
- Redevances initiales (formation, accompagnement)
- Redevances périodiques (% CA ou forfait)
- Fréquence paiement redevances
- Savoir-faire transmis (description précise NON BANALE)
- Manuel opératoire fourni
- Formation initiale (durée, lieu, contenu)
- Formation continue annuelle
- Assistance technique (type, fréquence)
- Obligation approvisionnement (exclusif ou référencement)
- Stocks minimum obligatoires
- Aménagement local (cahier charges architectural)
- Dotation publicitaire
- Communication locale (liberté ou validation préalable)
- Objectifs de CA (indicatifs ou impératifs)
- Contrôles et audits (fréquence)
- Clause de non-concurrence post-contractuelle (durée, périmètre)
- Clause de non-affiliation
- Conditions renouvellement
- DIP (Document Info Précontractuelle) remis 20 jours minimum avant

🏘️ COMPROMIS DE VENTE IMMOBILIER:
OBLIGATOIRE:
- Nature du bien (maison, appartement, terrain)
- Adresse exacte et références cadastrales
- Surface (loi Carrez si copropriété, surface terrain)
- Prix de vente EXACT
- Modalités de paiement (séquestre, virement)
- Délai de réalisation de la vente
- Conditions suspensives:
  * Obtention prêt (montant, durée max, taux max)
  * Obtention permis de construire si applicable
  * Droit de préemption
- Diagnostics obligatoires à fournir:
  * DPE (validité 10 ans)
  * Amiante (si avant 1997)
  * Plomb (si avant 1949)
  * Termites (si zone à risque)
  * ERP (Risques naturels)
  * Gaz (si > 15 ans)
  * Électricité (si > 15 ans)
  * Assainissement non collectif
  * Loi Carrez
- Charges de copropriété (montant annuel)
- Travaux votés non encore payés
- Servitudes affectant le bien
- Urbanisme (zone PLU, COS)
- Origine de propriété
- Garanties (vice caché, éviction)
- Frais de notaire et répartition
- Délai de rétractation acquéreur (10 jours)

📋 PRESTATION DE SERVICES B2B:
OBLIGATOIRE:
- Objet précis de la prestation (livrables détaillés)
- Nature obligation (moyens ou résultat)
- Durée déterminée ou indéterminée
- Délais d'exécution avec jalons
- Prix (forfait ou régie)
- Si régie: taux horaire/journalier
- Modalités facturation (mensuelle, étapes)
- Conditions paiement (30 jours fin de mois, etc.)
- Pénalités retard paiement (3x taux BCE + 40€ frais recouvrement)
- Clause révision prix (indice référence)
- Garantie bonne fin
- Assurance responsabilité civile professionnelle
- Propriété intellectuelle (cession ou licence)
- Confidentialité (durée, périmètre)
- Sous-traitance autorisée ou non
- Force majeure
- Clause résolutoire
- Préavis résiliation
- Pénalités retard ou non-conformité
- Juridiction compétente
- Médiation/arbitrage
- Loi applicable

ÉTAPE 3 - CHAMPS CONDITIONNELS INTELLIGENTS:
Créer des dépendances logiques:
- Si "bien en copropriété" = Oui → Demander "charges copropriété", "procès-verbaux AG"
- Si "clause suspensive prêt" = Oui → Demander "montant prêt", "durée", "taux max"
- Si "CDD" → Demander "motif recours", "date fin"
- Si "clause non-concurrence" = Oui → Demander "durée", "zone géographique", "contrepartie financière"

ÉTAPE 4 - DOCUMENTS JUSTIFICATIFS:
Ajouter champs "file" pour TOUS les documents obligatoires

ÉTAPE 5 - VALIDATION QUALITÉ:
Avant de retourner le schéma, VÉRIFIER:
✅ Toutes les mentions légales obligatoires sont demandées
✅ Aucun champ superflu
✅ Labels clairs en français juridique
✅ Champs required pour infos bloquantes
✅ Placeholders explicites

🎯 EXIGENCE MAXIMALE: Le formulaire doit permettre de générer un contrat OPPOSABLE EN L'ÉTAT, sans retour avocat.

Structure JSON (20-40 champs attendus selon complexité du contrat):
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

🎯 OBLIGATION ABSOLUE: Chaque schéma DOIT commencer par "client_roles" avec les parties adaptées au type de contrat.

EXEMPLES OBLIGATOIRES par type de contrat:

CONTRAT DE FRANCHISE:
{
  "client_roles": ["Le franchiseur", "Le franchisé"],  // ⚠️ OBLIGATOIRE
  "fields": [
    { "id": "enseigne", "label": "Enseigne et marque", "type": "text", "required": true },
    { "id": "territoire", "label": "Territoire d'exclusivité", "type": "textarea", "required": true },
    { "id": "droit_entree", "label": "Droit d'entrée (€)", "type": "number", "required": true }
  ]
}

CONTRAT DE TRAVAIL (CDI/CDD):
{
  "client_roles": ["L'employeur", "Le salarié"],  // ⚠️ OBLIGATOIRE
  "fields": [
    { "id": "type_contrat", "label": "Type de contrat", "type": "select", "options": ["CDI", "CDD", "Alternance"], "required": true },
    { "id": "poste", "label": "Intitulé du poste", "type": "text", "required": true },
    { "id": "salaire_brut", "label": "Salaire brut mensuel (€)", "type": "number", "required": true }
  ]
}

COMPROMIS/VENTE IMMOBILIÈRE:
{
  "client_roles": ["Le vendeur", "L'acquéreur"],  // ⚠️ OBLIGATOIRE
  "fields": [
    { "id": "adresse_bien", "label": "Adresse du bien", "type": "textarea", "required": true },
    { "id": "prix_vente", "label": "Prix de vente (€)", "type": "number", "required": true },
    { "id": "clause_suspensive", "label": "Clause suspensive d'obtention de prêt", "type": "select", "options": ["Oui", "Non"], "required": true }
  ]
}

BAIL D'HABITATION:
{
  "client_roles": ["Le bailleur", "Le locataire"],  // ⚠️ OBLIGATOIRE
  "fields": [
    { "id": "adresse_logement", "label": "Adresse du logement", "type": "textarea", "required": true },
    { "id": "loyer_mensuel", "label": "Loyer mensuel (€)", "type": "number", "required": true },
    { "id": "meuble", "label": "Logement meublé", "type": "select", "options": ["Oui", "Non"], "required": true }
  ]
}

PRESTATION DE SERVICES:
{
  "client_roles": ["Le prestataire", "Le client"],  // ⚠️ OBLIGATOIRE
  "fields": [
    { "id": "objet_prestation", "label": "Objet de la prestation", "type": "textarea", "required": true },
    { "id": "prix", "label": "Prix de la prestation (€)", "type": "number", "required": true }
  ]
}`

    const userPrompt = `Type de contrat: ${contractType}
Rôle du professionnel: ${role === 'notaire' ? 'Notaire' : 'Avocat'}
Description/Besoin spécifique: ${description || 'Formulaire standard'}

⚠️ IMPÉRATIF: Tu DOIS générer le champ "client_roles" adapté au type de contrat ${contractType}.
Exemples de client_roles selon le type:
- Franchise → ["Le franchiseur", "Le franchisé"]
- Travail → ["L'employeur", "Le salarié"]
- Vente → ["Le vendeur", "L'acquéreur"]
- Bail → ["Le bailleur", "Le locataire"]
- Prestation → ["Le prestataire", "Le client"]

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
