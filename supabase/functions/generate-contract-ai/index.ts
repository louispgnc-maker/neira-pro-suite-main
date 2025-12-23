import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.32.1";

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
    const { contractType, formData, clientInfo } = await req.json();

    if (!contractType || !formData) {
      return new Response(
        JSON.stringify({ error: 'contractType et formData sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY non configurée');
    }

    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    // Construction du prompt selon le type de contrat
    const systemPrompt = getSystemPrompt(contractType);
    const userPrompt = buildUserPrompt(contractType, formData, clientInfo);

    console.log('Génération du contrat:', contractType);

    // Appel à Claude
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 16000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt
        }
      ]
    });

    const generatedContract = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    return new Response(
      JSON.stringify({ 
        success: true,
        contract: generatedContract,
        tokens: message.usage
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
  const basePrompt = `Tu es un expert juridique français spécialisé dans la rédaction de documents juridiques. 

RÈGLES ABSOLUES:
1. Rédige en français juridique formel et précis
2. Si un champ n'est pas fourni, écris "[À COMPLÉTER]" à sa place
3. Respecte scrupuleusement le droit français en vigueur
4. Structure le document avec des articles numérotés
5. Inclus tous les éléments obligatoires selon le type de document
6. Utilise un ton professionnel et juridiquement approprié
7. Ajoute les clauses de protection nécessaires
8. Format: texte brut prêt à l'impression (pas de markdown)`;

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
  };

  return contractPrompts[contractType] || basePrompt;
}

function buildUserPrompt(contractType: string, formData: any, clientInfo: any): string {
  let prompt = `Génère le contrat suivant en respectant STRICTEMENT les instructions du system prompt.\n\n`;
  
  prompt += `TYPE DE DOCUMENT: ${contractType}\n\n`;
  
  prompt += `DONNÉES DU FORMULAIRE:\n`;
  prompt += JSON.stringify(formData, null, 2);
  prompt += `\n\n`;
  
  if (clientInfo && Object.keys(clientInfo).length > 0) {
    prompt += `INFORMATIONS CLIENT:\n`;
    prompt += JSON.stringify(clientInfo, null, 2);
    prompt += `\n\n`;
  }
  
  prompt += `INSTRUCTIONS FINALES:
- Utilise TOUTES les données fournies
- Pour chaque champ vide, manquant ou undefined: écris "[À COMPLÉTER]"
- Structure le document de manière professionnelle
- Respecte le formalisme juridique français
- Ne demande JAMAIS de confirmation, génère directement le document complet
- Format: texte brut (pas de markdown, pas de balises)
- Le document doit être prêt à l'impression/signature`;

  return prompt;
}
