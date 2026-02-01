import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contractType, formData, clientInfo, attachments } = await req.json();

    if (!contractType || !formData) {
      return new Response(
        JSON.stringify({ error: 'contractType et formData sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY non configurée');
    }

    // Logs détaillés pour déboguer
    console.log('📋 Génération du contrat:', contractType);
    console.log('📦 Données du formulaire:', JSON.stringify(formData, null, 2));
    console.log('👤 Infos client:', JSON.stringify(clientInfo, null, 2));
    console.log('📊 Nombre de champs:', Object.keys(formData).length);
    console.log('📎 Pièces jointes:', attachments?.length || 0, 'fichiers');

    // Construction du prompt selon le type de contrat
    const systemPrompt = getSystemPrompt(contractType);
    const userPrompt = buildUserPrompt(contractType, formData, clientInfo, attachments);

    console.log('💬 Prompt utilisateur (premier 500 chars):', userPrompt.substring(0, 500));

    // Appel à OpenAI (ChatGPT)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o", // GPT-4o - le plus récent et performant
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        max_tokens: 16000,
        temperature: 0.3,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const generatedContract = data.choices[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ 
        success: true,
        contract: generatedContract,
        tokens: data.usage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erreur génération contrat:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erreur lors de la génération du contrat'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function getSystemPrompt(contractType: string): string {
  const basePrompt = `Tu es un expert juridique français spécialisé dans la rédaction de documents juridiques professionnels CONFORMES AU DROIT EN VIGUEUR.

⚖️ CONFORMITÉ JURIDIQUE OBLIGATOIRE - RÈGLES STRICTES:

1. 🔒 RGPD ET PROTECTION DES DONNÉES (OBLIGATOIRE):
   - Inclus SYSTÉMATIQUEMENT un article "Protection des données personnelles" conforme au RGPD
   - Mentionne : finalité du traitement, base légale, durée de conservation, droits des personnes (accès, rectification, effacement, portabilité, opposition)
   - Indique le responsable de traitement et le délégué à la protection des données si applicable
   - Précise les mesures de sécurité mises en œuvre
   - ⚠️ SANCTIONS : Rappelle que le non-respect peut entraîner jusqu'à 20M€ ou 4% du CA

2. 🔐 CONFIDENTIALITÉ ET SÉCURITÉ (OBLIGATOIRE):
   - Inclus TOUJOURS une clause de confidentialité robuste
   - Définis précisément les informations confidentielles
   - Prévois les obligations de sécurité et de protection
   - Indique la durée de l'obligation (souvent au-delà du contrat)
   - Précise les sanctions en cas de violation

3. 🤝 LOYAUTÉ ET TRANSPARENCE (OBLIGATOIRE):
   - Garantis l'équilibre des droits et obligations entre les parties
   - Évite les clauses abusives ou léonines
   - Rédige en français clair et compréhensible
   - Mentionne explicitement tous les coûts, frais et pénalités
   - Prévois des délais raisonnables et équilibrés

4. 📋 MENTIONS LÉGALES OBLIGATOIRES (À VÉRIFIER SELON LE TYPE):
   - Délai de rétractation (14 jours pour vente à distance/hors établissement)
   - Droit applicable et juridiction compétente
   - Médiation et règlement des litiges
   - Assurances professionnelles obligatoires
   - Numéro SIRET, RCS, TVA intracommunautaire si professionnel

5. 🛡️ CLAUSES DE PROTECTION SYSTÉMATIQUES:
   - Force majeure (définition précise)
   - Résiliation (conditions, préavis, indemnités)
   - Responsabilité (limitation raisonnable, assurances)
   - Propriété intellectuelle (attribution claire des droits)
   - Cession du contrat (conditions et autorisations)

6. ⚠️ CAS PARTICULIERS OBLIGATOIRES:
   - Contrats de consommation : conformité Code de la consommation
   - Contrats de travail : conformité Code du travail, convention collective
   - Contrats immobiliers : diagnostics obligatoires, droit de préemption
   - Contrats commerciaux : respect du droit de la concurrence

7. 🔍 AUTO-VÉRIFICATION AVANT FINALISATION:
   - Vérifie que TOUTES les clauses RGPD sont présentes
   - Vérifie la clause de confidentialité complète
   - Vérifie l'équilibre contractuel (pas de clause abusive)
   - Vérifie les mentions légales obligatoires du secteur
   - Vérifie que le contrat est opposable en justice

⚠️ RÈGLE D'OR : Un contrat incomplet ou non-conforme expose le professionnel à des sanctions. INTÈGRE AUTOMATIQUEMENT toutes les clauses de protection, même si non mentionnées dans les données du formulaire.

STYLE DE RÉDACTION - IMPÉRATIF:
1. 📝 RÉDIGE UN VRAI TEXTE JURIDIQUE FLUIDE ET PROFESSIONNEL
   - Utilise des phrases complètes et élégantes, pas des listes à puces
   - Rédige comme un juriste professionnel, pas comme un formulaire
   - Emploie le vocabulaire juridique approprié et les tournures formelles
   - Lie les clauses entre elles de manière cohérente et logique

2. ✍️ STYLE NARRATIF FORMEL:
   - "Entre les soussignés : D'une part, Monsieur/Madame [NOM PRÉNOM], né(e) le [DATE] à [LIEU], de nationalité [NATIONALITÉ], demeurant [ADRESSE], ci-après dénommé(e) 'le Vendeur'..."
   - "Il a été arrêté et convenu ce qui suit..."
   - "Les parties se sont rapprochées aux fins de..."
   - "Le présent contrat a pour objet de définir les conditions dans lesquelles..."
   - Évite absolument: "Vendeur: [NOM]", "Prix: [MONTANT]" (c'est du style liste)

3. 🎯 STRUCTURE PROFESSIONNELLE:
   - Préambule narratif exposant le contexte
   - Articles rédigés en paragraphes complets
   - Formules juridiques classiques ("Il est expressément convenu que...", "Les parties déclarent et reconnaissent que...")
   - Conclusion formelle avec date, lieu et signatures

4. ⚖️ RÈGLES JURIDIQUES STRICTES:
   - N'INVENTE AUCUNE INFORMATION - utilise UNIQUEMENT les données fournies
   - Si un champ n'est pas fourni, écris EXACTEMENT "[À COMPLÉTER]"
   - Ne mets JAMAIS de valeurs d'exemple ou fictives
   - Respecte scrupuleusement le droit français en vigueur

5. 📋 FORMAT ET PRÉSENTATION:
   - Format: texte brut prêt à l'impression (pas de markdown)
   - Articles numérotés clairement
   - Alinéas pour la lisibilité
   - Ton professionnel et juridiquement approprié

EXEMPLES DE BON STYLE:
✅ BON: "D'une part, la société ACME SARL, au capital de 50 000 euros, immatriculée au Registre du Commerce et des Sociétés de Paris sous le numéro 123 456 789, dont le siège social est situé 15 rue de la Paix, 75002 Paris, représentée par Monsieur Jean MARTIN en sa qualité de gérant, ci-après dénommée 'le Franchiseur',"

❌ MAUVAIS: "Franchiseur: ACME SARL, Capital: 50000€, RCS: 123456789, Adresse: 15 rue de la Paix"

✅ BON: "Article 1 - Objet du contrat\n\nLe présent contrat a pour objet l'octroi par le Franchiseur au profit du Franchisé d'un droit d'exploitation de son enseigne et de son savoir-faire dans le secteur de la restauration rapide, pour une durée de dix années.\n\nLe Franchisé s'engage à exploiter un établissement commercial situé à [ADRESSE] selon les normes et procédures définies par le Franchiseur, et à respecter l'ensemble des obligations découlant du présent contrat."

❌ MAUVAIS: "Article 1 - Objet\n- Type: Franchise restauration\n- Durée: 10 ans\n- Lieu: [ADRESSE]\n- Obligations: Respect des normes"

⚠️ RÈGLE CRITIQUE: 
- Rédige comme un avocat ou un notaire, pas comme un formulaire administratif
- Chaque article doit être un texte rédigé, pas une énumération
- Utilise les formules juridiques traditionnelles françaises
- Le contrat doit être imprimable et présentable en l'état à un tribunal`;

  const contractPrompts: { [key: string]: string } = {
    "Contrat de développement web/application": `${basePrompt}

Tu dois rédiger un CONTRAT DE DÉVELOPPEMENT WEB/APPLICATION complet incluant:
- Préambule avec identification complète des parties
- Article 1: Objet du contrat (description détaillée du projet)
- Article 2: Étendue de la mission (livrables, technologies, méthodologie)
- Article 3: Cahier des charges (spécifications fonctionnelles et techniques)
- Article 4: Planning et jalons (phases, délais, recettes)
- Article 5: Prix et modalités de paiement (détail, échéancier, pénalités)
- Article 6: Propriété intellectuelle (cession de droits, licence, code source)
- Article 7: Hébergement et maintenance
- Article 8: Garanties et responsabilités
- Article 9: Confidentialité et données personnelles (RGPD)
- Article 10: Résiliation
- Article 11: Litiges et droit applicable`,

    "Contrat de cession de droits d'auteur": `${basePrompt}

Tu dois rédiger un CONTRAT DE CESSION DE DROITS D'AUTEUR conforme au Code de la Propriété Intellectuelle (articles L131-3 et suivants) incluant:
- Préambule avec identification des parties (cédant/cessionnaire)
- Article 1: Objet de la cession (œuvre précisément identifiée)
- Article 2: Droits cédés (reproduction, représentation, adaptation - énumération précise)
- Article 3: Étendue territoriale (pays/monde)
- Article 4: Durée de la cession
- Article 5: Destination et supports (énumération limitative)
- Article 6: Contrepartie financière (rémunération proportionnelle ou forfaitaire justifiée)
- Article 7: Droits moraux (mention explicite de leur inaliénabilité)
- Article 8: Garanties de l'auteur
- Article 9: Droit applicable et juridiction compétente`,

    "Contrat de licence de logiciel": `${basePrompt}

Tu dois rédiger un CONTRAT DE LICENCE DE LOGICIEL incluant:
- Préambule et identification des parties (concédant/licencié)
- Article 1: Définitions (Logiciel, Documentation, Utilisateur, etc.)
- Article 2: Objet de la licence
- Article 3: Type de licence (utilisateur unique/multi-postes/entreprise)
- Article 4: Étendue des droits (utilisation, restrictions)
- Article 5: Interdictions (reverse engineering, copie, redistribution)
- Article 6: Propriété intellectuelle
- Article 7: Durée de la licence
- Article 8: Redevances et paiement
- Article 9: Support et maintenance (SLA si applicable)
- Article 10: Garanties limitées
- Article 11: Limitation de responsabilité
- Article 12: Confidentialité
- Article 13: Résiliation
- Article 14: Données personnelles (RGPD)`,

    "Testament olographe": `${basePrompt}

Tu dois rédiger un TESTAMENT OLOGRAPHE conforme à l'article 970 du Code civil.

AVERTISSEMENT CRITIQUE À INCLURE EN TÊTE:
"⚠️ MENTIONS MANUSCRITES OBLIGATOIRES
Pour être valable, ce testament DOIT être:
- Écrit entièrement à la main par le testateur
- Daté de sa main (jour, mois, année)
- Signé de sa main

Un testament dactylographié est NUL.
Ce document est un MODÈLE à recopier intégralement à la main."

Structure:
- Titre: "TESTAMENT"
- Corps du testament avec dispositions testamentaires claires
- Désignation des légataires avec parts précises
- Clauses facultatives (exécuteur testamentaire, legs particuliers)
- Date (à écrire à la main)
- Signature (à apposer à la main)`,

    "Bail d'habitation vide": `${basePrompt}

Tu dois rédiger un BAIL D'HABITATION VIDE conforme à la loi du 6 juillet 1989 incluant:
- Préambule et identification parties (bailleur/locataire)
- Article 1: Désignation du logement (adresse, surface, annexes)
- Article 2: Destination du local (habitation principale)
- Article 3: Durée du bail (3 ans minimum)
- Article 4: Loyer (montant, modalités paiement, révision)
- Article 5: Charges (montant provisionnel, régularisation)
- Article 6: Dépôt de garantie (1 mois maximum)
- Article 7: État des lieux (entrée/sortie)
- Article 8: Travaux (répartition bailleur/locataire)
- Article 9: Assurance habitation (obligation locataire)
- Article 10: Clause résolutoire
- Article 11: Congé (préavis 3 mois locataire, 6 mois bailleur)
- Annexes obligatoires (DPE, diagnostics, règlement copropriété)`,

    "Bail commercial": `${basePrompt}

Tu dois rédiger un BAIL COMMERCIAL conforme aux articles L145-1 et suivants du Code de commerce incluant:
- Préambule et identification parties (bailleur/locataire commerçant)
- Article 1: Désignation des locaux (adresse, surface, parties communes)
- Article 2: Destination (activité commerciale précise)
- Article 3: Durée (9 ans minimum avec résiliation triennale)
- Article 4: Loyer (montant, indexation ICC/ILC, plafonnement)
- Article 5: Charges, taxes, impôts (répartition détaillée)
- Article 6: Dépôt de garantie
- Article 7: Travaux (gros œuvre/bailleur, aménagements/locataire)
- Article 8: Cession et sous-location
- Article 9: Droit au renouvellement (propriété commerciale)
- Article 10: Clause résolutoire
- Article 11: Assurances
- Article 12: Litiges et juridiction compétente`,

    "Reconnaissance de dette": `${basePrompt}

Tu dois rédiger une RECONNAISSANCE DE DETTE conforme à l'article 1376 du Code civil.

AVERTISSEMENT À INCLURE:
"⚠️ MENTION MANUSCRITE OBLIGATOIRE
Pour être valable au-delà de 1 500€, la mention suivante DOIT être écrite entièrement à la main par le débiteur:
'Je reconnais devoir la somme de [montant en chiffres] euros ([montant en lettres] euros)'"

Structure:
- Titre: "RECONNAISSANCE DE DETTE"
- Identification du débiteur et du créancier
- Montant de la dette (chiffres et lettres)
- Cause de la dette (prêt, service rendu, etc.)
- Date de remboursement ou échéancier
- Taux d'intérêt (si applicable, légal par défaut)
- Modalités de remboursement
- Clause de déchéance du terme (si applicable)
- Date et lieu
- Signature du débiteur`,

    "Convention parentale (autorité parentale)": `${basePrompt}

Tu dois rédiger une CONVENTION PARENTALE relative à l'exercice de l'autorité parentale incluant:
- Préambule avec identification des parents et enfants
- Article 1: Résidence habituelle de l'enfant
- Article 2: Droit de visite et d'hébergement (calendrier détaillé)
- Article 3: Vacances scolaires (répartition été, Noël, autres)
- Article 4: Contribution financière à l'entretien et l'éducation
- Article 5: Scolarité et santé (décisions importantes)
- Article 6: Communication entre parents
- Article 7: Modification de la convention (accord mutuel)
- Article 8: Clause de révision
- Signatures des deux parents

Note: Cette convention peut être homologuée par le JAF`,

    "Mandat de protection future sous seing privé": `${basePrompt}

Tu dois rédiger un MANDAT DE PROTECTION FUTURE conforme aux articles 477 à 494 du Code civil.

AVERTISSEMENT À INCLURE:
"⚠️ MENTIONS MANUSCRITES OBLIGATOIRES
Pour être valable, ce mandat DOIT comporter:
- La mention manuscrite: 'Je confie à [nom du mandataire] la mission de me représenter pour le jour où je ne pourrai plus pourvoir seul à mes intérêts'
- Date écrite à la main
- Signature du mandant
Le mandat pour autrui (parent protégeant enfant) nécessite un acte notarié ou un contre-seing d'avocat."

Structure:
- Titre et avertissement
- Identification du mandant
- Désignation du(des) mandataire(s) (titulaire et suppléant)
- Étendue des pouvoirs (protection de la personne et/ou des biens)
- Pouvoirs précis accordés (gestion patrimoine, santé, logement, etc.)
- Durée et fin du mandat
- Rémunération éventuelle du mandataire
- Conditions de mise en œuvre (certificat médical)
- Date et signatures`,

    "État des lieux (annexe)": `${basePrompt}

Tu dois rédiger un ÉTAT DES LIEUX conforme au décret n°2016-382 du 30 mars 2016.

Structure détaillée:
- EN-TÊTE: Type (Entrée/Sortie), Date, Heure
- PARTIES: Identification bailleur et locataire
- LOCATIF: Adresse complète, étage, surface, nombre de pièces
- PRÉSENTS: Qui participe à l'état des lieux
- COMPTEURS: Relevés eau, électricité, gaz (si applicable)
- DESCRIPTION PIÈCE PAR PIÈCE:
  * Pour chaque pièce: sols, murs, plafonds, fenêtres, portes, équipements
  * État: Très bon / Bon / Moyen / Mauvais / Vétuste
  * Observations détaillées des dégradations
- ÉQUIPEMENTS: Liste complète avec état et fonctionnement
- CLÉS: Nombre et type remis
- OBSERVATIONS GÉNÉRALES
- ANNEXES: Liste des documents (DPE, diagnostics, etc.)
- SIGNATURES des deux parties

IMPORTANT: Neutralité et précision maximale des descriptions`,

    "Conditions Générales d'Utilisation (CGU)": `${basePrompt}

Tu dois rédiger des CONDITIONS GÉNÉRALES D'UTILISATION pour un service en ligne conformes au droit français incluant:
- Article 1: Objet et champ d'application
- Article 2: Mentions légales (éditeur, hébergeur)
- Article 3: Accès au service (conditions, inscription)
- Article 4: Description du service
- Article 5: Obligations de l'utilisateur (usage licite, interdictions)
- Article 6: Propriété intellectuelle
- Article 7: Données personnelles (RGPD - renvoi vers politique de confidentialité)
- Article 8: Responsabilité et garanties
- Article 9: Modification des CGU
- Article 10: Durée et résiliation
- Article 11: Droit applicable et juridiction compétente
- Article 12: Contact et réclamations`,

    "Politique de confidentialité / mentions légales / RGPD": `${basePrompt}

Tu dois rédiger un DOCUMENT DE CONFORMITÉ RGPD modulaire selon les sections demandées.

Le document peut contenir:

1. MENTIONS LÉGALES (si sélectionné):
- Éditeur du site (raison sociale, SIREN, siège, représentant légal)
- Coordonnées complètes (téléphone, email)
- Hébergeur (nom, adresse)
- Activité réglementée (n° d'ordre, RC Pro, etc.)

2. POLITIQUE DE CONFIDENTIALITÉ / RGPD (si sélectionné):
- Responsable du traitement
- Données collectées (catégories détaillées)
- Finalités du traitement
- Bases légales (consentement, contrat, obligation légale, intérêt légitime)
- Destinataires des données
- Durées de conservation
- Transferts hors UE (garanties)
- Droits des personnes (accès, rectification, effacement, limitation, portabilité, opposition)
- Contact DPO si applicable
- Réclamation CNIL

3. POLITIQUE COOKIES (si sélectionné):
- Types de cookies (essentiels, fonctionnels, analytiques, publicitaires)
- Finalités précises
- Durée de conservation
- Gestion du consentement
- Opposition et paramétrage

4. DOCUMENTATION RGPD (si liée à politique confidentialité):
- Analyse DPIA (si traitement à risque élevé)
- Procédure de gestion des violations de données
- Registre des traitements (mention)

Format: Document structuré avec titres clairs, prêt à publication`,

    "Pacte de préférence": `${basePrompt}

Tu dois rédiger un PACTE DE PRÉFÉRENCE conforme à l'article 1123 du Code civil incluant:
- Préambule et identification des parties (promettant/bénéficiaire)
- Article 1: Objet du pacte (bien concerné avec description précise)
- Article 2: Droit de préférence (conditions d'exercice)
- Article 3: Durée du pacte (limitée dans le temps)
- Article 4: Modalités d'information (délai, forme)
- Article 5: Prix et conditions (alignement sur offre tiers)
- Article 6: Délai de réponse du bénéficiaire
- Article 7: Sanction en cas de violation (nullité de la vente, dommages-intérêts)
- Article 8: Formalités (publicité foncière si immobilier)
- Signatures`,

    "Compromis de vente immobilière": `${basePrompt}

Tu dois rédiger un COMPROMIS DE VENTE IMMOBILIÈRE incluant:
- Préambule et identification des parties (vendeur(s)/acquéreur(s))
- Article 1: Désignation du bien (adresse, cadastre, surface, lots)
- Article 2: Origine de propriété
- Article 3: Prix de vente (montant, répartition)
- Article 4: Conditions suspensives (prêt, permis, préemption, etc.)
- Article 5: Dépôt de garantie/séquestre
- Article 6: Charges et conditions (travaux, servitudes)
- Article 7: Documents et diagnostics obligatoires
- Article 8: Délai de réalisation
- Article 9: Clause pénale (indemnité d'immobilisation)
- Article 10: Frais (notaire, agence)
- Article 11: Droit de rétractation (10 jours acquéreur)
- Article 12: Déclarations fiscales et urbanisme
- Signatures + mention rétractation`,

    "Acte de vente immobilière": `${basePrompt}

Tu dois rédiger un ACTE DE VENTE IMMOBILIÈRE notarié incluant:
- Comparution des parties (vendeur(s) et acquéreur(s) avec état civil complet)
- Article 1: Désignation du bien (références cadastrales, surface loi Carrez)
- Article 2: Origine de propriété (chaîne des titres)
- Article 3: Prix de vente et modalités de paiement
- Article 4: Jouissance (date d'entrée en possession)
- Article 5: Charges et conditions (servitudes, mitoyenneté, urbanisme)
- Article 6: Documents remis (diagnostics, règlement copropriété)
- Article 7: Garanties (éviction, vices cachés)
- Article 8: Déclarations fiscales (plus-value, TVA si applicable)
- Article 9: Frais et honoraires
- Article 10: Affectation hypothécaire si prêt
- Article 11: Élection de domicile
- Certifications et signatures devant notaire`,

    "NDA / Accord de confidentialité": `${basePrompt}

Tu dois rédiger un ACCORD DE CONFIDENTIALITÉ (NDA) incluant:
- Préambule et contexte (projet, négociation)
- Article 1: Définitions (Informations Confidentielles, Partie Émettrice/Réceptrice)
- Article 2: Obligation de confidentialité
- Article 3: Exceptions (informations publiques, déjà connues, obligation légale)
- Article 4: Utilisation autorisée (limitative)
- Article 5: Mesures de protection
- Article 6: Non-divulgation à des tiers
- Article 7: Durée de l'obligation (pendant et après relation)
- Article 8: Restitution/destruction des informations
- Article 9: Propriété intellectuelle
- Article 10: Sanction en cas de violation (dommages-intérêts)
- Article 11: Droit applicable et juridiction
- Signatures`,

    "Contrat de travail CDI": `${basePrompt}

Tu dois rédiger un CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE conforme au Code du travail incluant:
- Préambule et identification des parties (employeur/salarié)
- Article 1: Engagement et poste (intitulé, classification)
- Article 2: Date de début et période d'essai
- Article 3: Fonctions et missions
- Article 4: Lieu de travail
- Article 5: Durée du travail (temps plein/partiel, horaires)
- Article 6: Rémunération (salaire brut, primes, avantages)
- Article 7: Congés payés
- Article 8: Clause de mobilité (si applicable)
- Article 9: Clause de confidentialité
- Article 10: Clause de non-concurrence (si applicable, avec contrepartie)
- Article 11: Convention collective applicable
- Article 12: Modification du contrat
- Article 13: Rupture du contrat
- Signatures`,

    "Contrat de travail CDD": `${basePrompt}

Tu dois rédiger un CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE conforme aux articles L1242-1 et suivants du Code du travail.

MENTIONS OBLIGATOIRES:
- Motif précis du recours au CDD (remplacement, accroissement temporaire, travaux temporaires, etc.)
- Nom et qualification du salarié remplacé (si remplacement)
- Date de fin de contrat OU durée minimale (si CDD sans terme précis)
- Désignation du poste et qualification
- Durée de la période d'essai
- Montant de la rémunération et primes
- Caisse de retraite complémentaire et organisme de prévoyance
- Convention collective applicable

Structure:
- Article 1: Engagement et motif du CDD
- Article 2: Durée du contrat (début et fin)
- Article 3: Période d'essai
- Article 4: Fonctions
- Article 5: Lieu de travail
- Article 6: Durée du travail
- Article 7: Rémunération (avec prime de précarité 10%)
- Article 8: Congés payés (avec indemnité compensatrice)
- Article 9: Renouvellement (conditions)
- Article 10: Rupture anticipée (cas limitatifs)
- Article 11: Convention collective
- Signatures`,

    "Rupture conventionnelle": `${basePrompt}

Tu dois rédiger une CONVENTION DE RUPTURE CONVENTIONNELLE conforme aux articles L1237-11 et suivants du Code du travail.

AVERTISSEMENT:
"Ce document formalise l'accord de rupture. Les parties disposent d'un délai de rétractation de 15 jours calendaires. L'homologation par la DREETS est requise (demande dans les 15 jours suivant la fin du délai de rétractation)."

Structure obligatoire:
- Préambule et identification des parties
- Article 1: Principe de la rupture conventionnelle (accord mutuel)
- Article 2: Date de fin du contrat (après délais légaux)
- Article 3: Indemnité de rupture (calcul détaillé, minimum légal)
- Article 4: Indemnité compensatrice de congés payés
- Article 5: Solde de tout compte
- Article 6: Certificat de travail et attestation Pôle emploi
- Article 7: Délai de rétractation (15 jours)
- Article 8: Homologation DREETS
- Date d'entretien(s) préalable(s) (minimum 1)
- Date de signature
- Signatures des parties`,

    "Contrat de stage": `${basePrompt}

Tu dois rédiger une CONVENTION DE STAGE conforme aux articles L124-1 et suivants du Code de l'éducation.

Parties au contrat:
- Établissement d'enseignement
- Organisme d'accueil (entreprise)
- Stagiaire

Mentions obligatoires:
- Article 1: Intitulé complet de la formation et diplôme préparé
- Article 2: Nom du tuteur enseignant et du tuteur en entreprise
- Article 3: Objectifs, activités confiées et compétences visées
- Article 4: Dates de début et fin (durée totale)
- Article 5: Durée hebdomadaire de présence (35h max)
- Article 6: Gratification (obligatoire si stage > 2 mois, taux légal 15% plafond SS)
- Article 7: Régime de protection sociale
- Article 8: Avantages (tickets restaurant, transport, etc.)
- Article 9: Conditions d'encadrement
- Article 10: Discipline et règlement intérieur
- Article 11: Assurance responsabilité civile
- Article 12: Modalités d'évaluation
- Article 13: Clause de confidentialité
- Article 14: Conditions de suspension/résiliation
- Signatures des 3 parties`,

    "Protocole d'accord prud'homal": `${basePrompt}

Tu dois rédiger un PROTOCOLE D'ACCORD TRANSACTIONNEL PRUD'HOMAL conforme à l'article 2044 du Code civil.

AVERTISSEMENT:
"Cette transaction met fin de manière définitive au litige. Elle vaut uniquement si elle contient des concessions réciproques. Aucune rétractation n'est possible sauf vice du consentement."

Structure:
- Préambule: Contexte du litige (saisine CPH, demandes)
- Article 1: Reconnaissance des faits
- Article 2: Concessions réciproques
- Article 3: Indemnité transactionnelle (montant et nature)
- Article 4: Décomposition (partie soumise/non soumise à charges sociales)
- Article 5: Modalités de paiement
- Article 6: Désistement de l'instance (si procédure en cours)
- Article 7: Renonciation à toute action future (portée précise)
- Article 8: Clause de confidentialité
- Article 9: Documents remis (certificat de travail, solde de tout compte, attestation Pôle emploi)
- Article 10: Exécution de bonne foi
- Article 11: Attribution de compétence (tribunal judiciaire)
- Signatures + mention "Lu et approuvé, bon pour transaction"`,

    // ========== NOTAIRES - FAMILLE / SUCCESSIONS ==========
    
    "Contrat de mariage": `${basePrompt}

Tu dois rédiger un CONTRAT DE MARIAGE établi par acte notarié incluant:
- Comparution des futurs époux avec état civil complet
- Article 1: Choix du régime matrimonial (séparation de biens, communauté universelle, participation aux acquêts, etc.)
- Article 2: Apports de chaque époux (biens propres, valeur)
- Article 3: Clauses particulières (clause d'attribution, avantages matrimoniaux)
- Article 4: Gestion des biens (pouvoirs, biens professionnels)
- Article 5: Dettes (responsabilité de chaque époux)
- Article 6: Dissolution du régime (liquidation, partage)
- Article 7: Dispositions fiscales
- Certifications notariales et signatures`,

    "PACS (Pacte civil de solidarité)": `${basePrompt}

Tu dois rédiger une CONVENTION DE PACS conforme aux articles 515-1 et suivants du Code civil incluant:
- Préambule: Identité complète des partenaires
- Article 1: Déclaration de PACS (aide mutuelle, assistance matérielle)
- Article 2: Régime des biens (séparation de biens ou indivision)
- Article 3: Résidence commune
- Article 4: Contribution aux charges (proportionnelle aux facultés)
- Article 5: Solidarité des dettes ménagères
- Article 6: Biens indivis (si applicable, parts, gestion)
- Article 7: Modification de la convention
- Article 8: Dissolution du PACS
- Date, signatures
- Mention dépôt au greffe du tribunal`,

    "Donation entre époux (donation au dernier vivant)": `${basePrompt}

Tu dois rédiger une DONATION ENTRE ÉPOUX (donation au dernier vivant) conforme aux articles 1093 et suivants du Code civil.

Structure:
- Préambule: Identification des époux, date et lieu mariage
- Article 1: Objet de la donation (quotité disponible)
- Article 2: Options du conjoint survivant (usufruit universel, 1/4 pleine propriété + 3/4 usufruit, quotité disponible en pleine propriété)
- Article 3: Révocabilité (donation révocable à tout moment)
- Article 4: Acceptation du donataire
- Article 5: Effet de la donation (au décès du donateur)
- Article 6: Clause de réversion (si les deux époux se donnent mutuellement)
- Signatures
- Certification notariale (forme authentique obligatoire)`,

    "Donation simple": `${basePrompt}

Tu dois rédiger une DONATION SIMPLE (donation entre vifs) conforme aux articles 931 et suivants du Code civil.

Structure:
- Préambule: Identification donateur et donataire
- Article 1: Objet de la donation (bien(s) donné(s) avec description précise)
- Article 2: Acceptation du donataire
- Article 3: Dessaisissement immédiat et irrévocable
- Article 4: Charges éventuelles (obligations du donataire)
- Article 5: Réserve d'usufruit (si applicable)
- Article 6: Droit de retour conventionnel (si applicable)
- Article 7: Rapport à succession (donation rapportable ou hors part)
- Article 8: Clause d'inaliénabilité (si applicable, motif légitime)
- Article 9: Garanties et origine de propriété
- Article 10: Frais et droits d'enregistrement
- Certification notariale et signatures`,

    "Testament authentique": `${basePrompt}

Tu dois rédiger un TESTAMENT AUTHENTIQUE reçu par notaire conforme à l'article 971 du Code civil.

Structure notariale:
- Préambule: Notaire, testateur avec état civil complet
- Déclaration du testateur quant à sa volonté
- Article 1: Révocation testaments antérieurs
- Article 2: Legs universels (désignation légataire(s), parts)
- Article 3: Legs à titre universel (quote-part de la succession)
- Article 4: Legs particuliers (biens spécifiques)
- Article 5: Clause de substitution (si applicable)
- Article 6: Exécuteur testamentaire (désignation, pouvoirs, rémunération)
- Article 7: Conditions et charges
- Article 8: Clause résolutoire
- Lecture par le notaire, déclaration du testateur
- Signatures (testateur, notaire, témoins si requis)
- Mention de conservation au fichier central`,

    "Déclaration de succession": `${basePrompt}

Tu dois rédiger une DÉCLARATION DE SUCCESSION (acte de notoriété + déclaration fiscale) conforme au Code civil et au Code général des impôts.

Structure:
- ACTE DE NOTORIÉTÉ (article 730 Code civil):
  * Décès (date, lieu, dernier domicile)
  * Situation familiale du défunt
  * Héritiers ou légataires (état civil, vocation successorale, parts)
  * Existence ou absence de testament
  * Existence d'une donation entre époux
  * Option des héritiers (acceptation pure et simple / à concurrence actif net)

- DÉCLARATION FISCALE (formulaire 2705):
  * Actif successoral détaillé (immobilier, mobilier, comptes, etc.)
  * Passif déductible (dettes, frais funéraires)
  * Actif net taxable
  * Abattements et réductions
  * Calcul des droits de succession
  
- Attestation immobilière (si biens immobiliers)
- Signatures héritiers et notaire`,

    "Acte de notoriété": `${basePrompt}

Tu dois rédiger un ACTE DE NOTORIÉTÉ conforme à l'article 730 du Code civil établissant la dévolution successorale.

Structure:
- Préambule: Notaire instrumentant
- Article 1: Décès (identité défunt, date, lieu, domicile)
- Article 2: Situation matrimoniale (célibataire, marié, veuf, divorcé)
- Article 3: Régime matrimonial (si marié)
- Article 4: Enfants et descendants
- Article 5: Testament (existence, date, dépositaire)
- Article 6: Donation entre époux (le cas échéant)
- Article 7: Qualité et vocation des héritiers
- Article 8: Parts héréditaires de chacun
- Article 9: Renonciation éventuelle
- Article 10: Option des héritiers (acceptation pure et simple)
- Déclarations des comparants
- Certification notariale
- Signatures`,

    "Partage successoral": `${basePrompt}

Tu dois rédiger un ACTE DE PARTAGE SUCCESSORAL conforme aux articles 815 et suivants du Code civil.

Structure notariale:
- Préambule: Décès, héritiers comparants
- Article 1: Rappel dévolution (acte de notoriété)
- Article 2: Actif successoral (inventaire détaillé)
- Article 3: Passif (dettes, charges, frais)
- Article 4: Masse à partager (actif net)
- Article 5: Rapport des donations (si applicable)
- Article 6: Formation des lots (description de chaque lot, valeur)
- Article 7: Attribution des lots (tirage au sort ou accord)
- Article 8: Soultes éventuelles (montant, modalités paiement)
- Article 9: Garantie des lots
- Article 10: Publicité foncière (si biens immobiliers)
- Article 11: Frais d'acte
- Signatures héritiers et certification notariale`,

    "Changement de régime matrimonial": `${basePrompt}

Tu dois rédiger un acte de CHANGEMENT DE RÉGIME MATRIMONIAL conforme à l'article 1397 du Code civil.

Structure:
- Préambule: Époux, mariage initial, régime actuel
- Article 1: Motif du changement (intérêt familial, adaptation situation)
- Article 2: Nouveau régime choisi (description complète)
- Article 3: Liquidation du régime antérieur
- Article 4: Effet du changement (opposabilité date acte)
- Article 5: Information des enfants majeurs (preuve)
- Article 6: Information des créanciers (publication, opposition)
- Article 7: Homologation judiciaire (si nécessaire)
- Déclarations des époux
- Certification notariale
- Signatures

Note: Opposable aux tiers 3 mois après mention en marge acte mariage`,

    // ========== NOTAIRES - IMMOBILIER ==========

    "Promesse unilatérale de vente": `${basePrompt}

Tu dois rédiger une PROMESSE UNILATÉRALE DE VENTE immobilière incluant:
- Préambule: Promettant (vendeur) et bénéficiaire (acquéreur potentiel)
- Article 1: Engagement unilatéral de vendre
- Article 2: Désignation du bien (cadastre, surface, adresse)
- Article 3: Prix de vente
- Article 4: Durée de l'option (délai levée option)
- Article 5: Indemnité d'immobilisation (montant, sort en cas levée/non levée)
- Article 6: Conditions suspensives (prêt, permis, etc.)
- Article 7: Conditions de levée de l'option
- Article 8: Sanction (si vente à un tiers pendant durée option)
- Article 9: Frais
- Signatures
- Enregistrement obligatoire`,

    "Bail emphytéotique": `${basePrompt}

Tu dois rédiger un BAIL EMPHYTÉOTIQUE conforme aux articles L451-1 et suivants du Code rural.

Structure:
- Préambule: Bailleur et preneur (emphytéote)
- Article 1: Objet (droit réel immobilier de longue durée)
- Article 2: Désignation du bien
- Article 3: Durée (minimum 18 ans, maximum 99 ans)
- Article 4: Redevance emphytéotique (montant, révision)
- Article 5: Droits du preneur (amélioration, construction, hypothèque)
- Article 6: Obligations du preneur (entretien, assurances, impôts)
- Article 7: Travaux et améliorations (propriété au terme)
- Article 8: Cession et sous-location
- Article 9: Fin du bail (renouvellement, sort des constructions)
- Article 10: Résiliation anticipée
- Acte notarié obligatoire, publicité foncière`,

    "Convention d'indivision": `${basePrompt}

Tu dois rédiger une CONVENTION D'INDIVISION conforme aux articles 1873-1 et suivants du Code civil.

Structure:
- Préambule: Indivisaires et origine de l'indivision
- Article 1: Objet de l'indivision (biens concernés, quotes-parts)
- Article 2: Durée de l'indivision (maximum 5 ans, renouvelable)
- Article 3: Gérant de l'indivision (désignation, pouvoirs)
- Article 4: Règles de gestion (unanimité, majorité 2/3)
- Article 5: Jouissance des biens (répartition, indemnités d'occupation)
- Article 6: Contribution aux charges (proportion des droits)
- Article 7: Travaux et améliorations
- Article 8: Cession de parts (droit de préemption des coindivisaires)
- Article 9: Partage provisionnel
- Article 10: Sortie de l'indivision
- Article 11: Liquidation
- Signatures, publicité si bien immobilier`,

    "Mainlevée d'hypothèque": `${basePrompt}

Tu dois rédiger une MAINLEVÉE D'HYPOTHÈQUE conforme à l'article 2440 du Code civil.

Structure:
- Préambule: Créancier hypothécaire et débiteur
- Article 1: Rappel de l'inscription hypothécaire (date, volume, numéro, bureau des hypothèques)
- Article 2: Extinction de la créance (remboursement total, date)
- Article 3: Mainlevée totale de l'hypothèque
- Article 4: Radiation de l'inscription
- Article 5: Quittance et décharge
- Article 6: Frais de radiation
- Signature du créancier (ou représentant)
- Notification au conservateur des hypothèques`,

    // ========== NOTAIRES - DIVERS ==========

    "Procuration notariée": `${basePrompt}

Tu dois rédiger une PROCURATION NOTARIÉE (mandat) incluant:
- Préambule: Mandant et mandataire (état civil complet)
- Article 1: Objet du mandat (actes précisément visés)
- Article 2: Étendue des pouvoirs (limitation ou généralité)
- Article 3: Actes autorisés (vente, achat, gestion, représentation administrative, etc.)
- Article 4: Interdictions ou restrictions
- Article 5: Durée du mandat
- Article 6: Révocabilité
- Article 7: Obligation de reddition de comptes
- Article 8: Rémunération du mandataire (si applicable)
- Acceptation du mandataire
- Certification notariale
- Signatures`,

    "Quitus de dette": `${basePrompt}

Tu dois rédiger un QUITUS DE DETTE (reconnaissance de paiement et décharge).

Structure:
- Titre: "QUITUS DE DETTE"
- Préambule: Créancier et débiteur
- Article 1: Rappel de la dette (origine, montant initial, titre)
- Article 2: Reconnaissance du paiement intégral (date, modalités)
- Article 3: Quittance définitive et libératoire
- Article 4: Décharge totale et irrévocable
- Article 5: Renonciation à toute action en paiement
- Article 6: Annulation du titre de créance (si applicable)
- Date et lieu
- Signature du créancier`,

    "Cession de parts sociales": `${basePrompt}

Tu dois rédiger un ACTE DE CESSION DE PARTS SOCIALES (SARL/SCI) conforme aux articles L223-14 et suivants du Code de commerce.

Structure:
- Préambule: Cédant et cessionnaire (avec qualité d'associé)
- Article 1: Désignation de la société (dénomination, siège, RCS, capital)
- Article 2: Parts cédées (nombre, numérotation)
- Article 3: Prix de cession (montant, modalités de paiement)
- Article 4: Agrément de la société (si requis, preuve)
- Article 5: Garanties du cédant (propriété, absence de charges)
- Article 6: Transfert de propriété (date effet)
- Article 7: Jouissance (dividendes, droits de vote)
- Article 8: Formalités (modification des statuts, registre)
- Article 9: Frais et droits d'enregistrement
- Signatures
- Enregistrement obligatoire (droit fixe 5% ou 3%)`,

    "Attestation notariée": `${basePrompt}

Tu dois rédiger une ATTESTATION NOTARIÉE (certification de faits ou situations).

Structure:
- Titre: "ATTESTATION"
- Préambule: Notaire instrumentant
- Article 1: Objet de l'attestation (fait à certifier)
- Article 2: Déclaration du comparant (identité, qualité)
- Article 3: Éléments de preuve produits
- Article 4: Certification du notaire (vu et vérifié)
- Article 5: Portée de l'attestation
- Article 6: Destination (utilisation prévue)
- Date et lieu
- Signature du déclarant
- Certification et sceau du notaire

Exemples: attestation de propriété, attestation d'héritier, attestation de vie commune, etc.`,

    "Pacte de concubinage": `${basePrompt}

Tu dois rédiger un PACTE DE CONCUBINAGE (convention de vie commune hors mariage/PACS).

Structure:
- Préambule: Identification des concubins
- Article 1: Déclaration de vie commune stable et continue
- Article 2: Résidence commune (adresse, statut bien)
- Article 3: Contribution aux charges (répartition, montant)
- Article 4: Régime des biens (séparation, liste biens propres de chacun)
- Article 5: Biens acquis en commun (indivision, quotes-parts)
- Article 6: Solidarité des dettes (limitation)
- Article 7: Épargne et comptes bancaires
- Article 8: Modification de la convention
- Article 9: Rupture (préavis, liquidation des biens communs)
- Date et signatures
- Possibilité d'enregistrement pour date certaine`,

    "Mise en demeure": `${basePrompt}

Tu dois rédiger une MISE EN DEMEURE conforme à l'article 1344 du Code civil.

Structure:
- Expéditeur (créancier/demandeur)
- Destinataire (débiteur/défaillant)
- Objet: MISE EN DEMEURE
- Article 1: Rappel de l'obligation (contrat, date, objet)
- Article 2: Constatation du manquement (nature, date)
- Article 3: Sommation d'exécuter (délai précis, généralement 8 jours)
- Article 4: Modalités d'exécution attendues
- Article 5: Réserve de tous droits
- Article 6: Avertissement des conséquences (résiliation, dommages-intérêts, action judiciaire)
- Article 7: Frais et intérêts de retard
- Fait à [lieu], le [date]
- Signature

Envoi recommandé AR obligatoire`,

    "Contrat d'agence commerciale": `${basePrompt}

Tu dois rédiger un CONTRAT D'AGENT COMMERCIAL conforme aux articles L134-1 et suivants du Code de commerce.

Structure:
- Préambule: Mandant (entreprise) et agent commercial
- Article 1: Objet du contrat (mandat de négociation et/ou conclusion)
- Article 2: Produits ou services concernés
- Article 3: Zone géographique (exclusivité ou non)
- Article 4: Durée du contrat (déterminée ou indéterminée)
- Article 5: Obligations de l'agent (prospection, compte-rendu, objectifs)
- Article 6: Obligations du mandant (fourniture documentation, formation, assistance)
- Article 7: Rémunération (commission, taux, modalités calcul et paiement)
- Article 8: Exclusivité (agent et/ou secteur)
- Article 9: Clientèle (propriété, indemnisation fin de contrat)
- Article 10: Clause de non-concurrence (durée, périmètre, contrepartie)
- Article 11: Résiliation (préavis, indemnité compensatrice)
- Article 12: Inscription au registre des agents commerciaux
- Signatures`,

  };

  return contractPrompts[contractType] || basePrompt;
}

function buildUserPrompt(contractType: string, formData: any, clientInfo: any, attachments?: any[]): string {
  let prompt = `Génère le contrat suivant en respectant STRICTEMENT les instructions du system prompt.\n\n`;
  
  prompt += `TYPE DE DOCUMENT: ${contractType}\n\n`;
  
  prompt += `⚠️ RAPPEL CRITIQUE: NE GÉNÈRE QUE CE QUI EST DANS LES DONNÉES CI-DESSOUS\n`;
  prompt += `- Si une section/clause n'a pas de données correspondantes → NE LA GÉNÈRE PAS\n`;
  prompt += `- Si un champ est vide → "[À COMPLÉTER]"\n`;
  prompt += `- Zéro invention, zéro exemple, zéro hypothèse\n\n`;
  
  prompt += `DONNÉES DU FORMULAIRE:\n`;
  prompt += JSON.stringify(formData, null, 2);
  prompt += `\n\n`;
  
  if (clientInfo && Object.keys(clientInfo).length > 0) {
    prompt += `INFORMATIONS CLIENT:\n`;
    prompt += JSON.stringify(clientInfo, null, 2);
    prompt += `\n\n`;
  }
  
  if (attachments && attachments.length > 0) {
    prompt += `PIÈCES JOINTES UPLOADÉES PAR LE CLIENT:\n`;
    attachments.forEach(file => {
      const sizeKb = (file.size / 1024).toFixed(2);
      prompt += `- ${file.name} (${file.type || 'type inconnu'}, ${sizeKb} Ko)`;
      if (file.category) {
        prompt += ` [Catégorie: ${file.category}]`;
      }
      prompt += `\n`;
    });
    prompt += `\nCes fichiers ont été fournis par le client et sont stockés dans le système. Tu dois MENTIONNER leur existence dans le contrat si pertinent (ex: "Les diagnostics techniques ont été fournis et sont annexés au présent contrat").\n\n`;
  }
  
  prompt += `INSTRUCTIONS FINALES:
- Utilise UNIQUEMENT les données présentes dans "DONNÉES DU FORMULAIRE" et "INFORMATIONS CLIENT"
- N'INVENTE AUCUNE information, même pour rendre le document plus complet
- NE GÉNÈRE PAS de clauses/articles pour lesquels tu n'as PAS de données
- Pour CHAQUE champ vide, manquant ou undefined: écris EXACTEMENT "[À COMPLÉTER]"
- Ne mets JAMAIS de valeurs d'exemple (ex: "Jean Dupont", "Paris", "01/01/2000", etc.)
- Ne génère JAMAIS de données fictives ou de placeholders génériques
- Un contrat court mais précis vaut MIEUX qu'un contrat long mais inventé
- Limite-toi strictement aux informations fournies
- Structure le document de manière professionnelle
- Respecte le formalisme juridique français
- Ne demande JAMAIS de confirmation, génère directement le document
- Format: texte brut (pas de markdown, pas de balises)
- Le document doit être prêt à l'impression/signature

RAPPEL CRITIQUE: Si une information n'est PAS dans les données fournies ci-dessus, tu DOIS écrire "[À COMPLÉTER]". Ne génère RIEN de ton imagination.`;

  return prompt;
}
