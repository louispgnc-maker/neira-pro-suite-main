#!/usr/bin/env python3
"""
Script pour appliquer automatiquement le pattern AI à tous les handlers de contrats
qui ne l'ont pas encore dans Contrats.tsx
"""

import re

# Lire le fichier
with open('src/pages/Contrats.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Handlers déjà intégrés avec AI (à ne pas modifier)
ALREADY_INTEGRATED = [
    'handleDevWebAppSubmit',
    'handleCessionDroitsAuteurSubmit', 
    'handleLicenceLogicielleSubmit',
    'handleMentionsLegalesSubmit'
]

# Mapping handler -> contractType pour l'Edge Function
CONTRACT_TYPE_MAPPING = {
    # Avocats
    'handleTestamentOlographeSubmit': 'Testament olographe',
    'handleReconnaissanceDetteSubmit': 'Reconnaissance de dette',
    'handleConventionParentaleSubmit': 'Convention parentale',
    'handleMandatProtectionSousSeingSubmit': 'Mandat de protection sous seing privé',
    'handleEtatLieuxSubmit': 'État des lieux',
    'handleGenericContractSubmit': 'Contrat de prestation de services',  # Generic
    'handleCGUSubmit': 'CGU',
    'handleMiseEnDemeureSubmit': 'Mise en demeure',
    'handlePacteConcubinageSubmit': 'Pacte de concubinage',
    'handleAgenceCommercialeSubmit': 'Agence commerciale',
    'handleProtocolePreudhommalSubmit': 'Protocole préud\'hommal',
    'handleCDISubmit': 'CDI',
    'handleCDDSubmit': 'CDD',
    'handleRuptureConventionnelleSubmit': 'Rupture conventionnelle',
    'handleStageSubmit': 'Stage',
    'handleCompromisVenteSubmit': 'Compromis de vente',
    'handleActeVenteSubmit': 'Acte de vente',
    'handleBailHabitationSubmit': 'Bail habitation',
    'handleBailCommercialSubmit': 'Bail commercial',
    'handleNDASubmit': 'NDA',
    
    # Notaires
    'handleContratMariageSubmit': 'Contrat de mariage',
    'handlePacsSubmit': 'PACS',
    'handleDonationEntreEpouxSubmit': 'Donation entre époux',
    'handleDonationSimpleSubmit': 'Donation simple',
    'handleTestamentSubmit': 'Testament authentique',
    'handleSuccessionSubmit': 'Succession',
    'handleActeNotorieteSubmit': 'Acte de notoriété',
    'handlePartageSuccessoralSubmit': 'Partage successoral',
    'handleChangementRegimeSubmit': 'Changement de régime matrimonial',
    'handlePromesseVenteSubmit': 'Promesse de vente',
    'handleBailEmphyteotiqueSubmit': 'Bail emphytéotique',
    'handleIndivisionSubmit': 'Indivision',
    'handleMainleveeSubmit': 'Mainlevée',
    'handleProcurationSubmit': 'Procuration',
    'handleMandatProtectionSubmit': 'Mandat de protection future',
    'handleQuitusDetteSubmit': 'Quitus de dette',
    'handleCessionPartsSubmit': 'Cession de parts',
    'handleAttestationSubmit': 'Attestation',
}

def apply_ai_pattern(handler_name, contract_type):
    """Applique le pattern AI à un handler spécifique"""
    
    # Pattern pour trouver le handler
    pattern = rf'(const {handler_name} = async \(\) => \{{\s+if \(!user\) return;\s+try \{{)'
    
    # Code à insérer AVANT l'insertion en DB
    ai_code = f'''
      // Génération du contrat par l'IA
      toast.info("Génération du contrat par l'IA...");
      const clientInfo = getClientInfo(/* client field */, clients);
      const generatedContract = await generateContractWithAI({{
        contractType: "{contract_type}",
        formData: {{ /* data */ }},
        clientInfo,
        user
      }});
'''
    
    # Pour l'instant, on va juste logger les handlers à modifier
    if re.search(pattern, content):
        return True
    return False

# Compter les handlers
total_handlers = len(CONTRACT_TYPE_MAPPING)
already_done = len(ALREADY_INTEGRATED)
to_do = total_handlers - already_done

print(f"📊 Analyse des handlers de contrats:")
print(f"  • Total handlers: {total_handlers}")
print(f"  • Déjà intégrés avec AI: {already_done}")
print(f"  • À intégrer: {to_do}")
print()

print("✅ Handlers déjà intégrés:")
for h in ALREADY_INTEGRATED:
    print(f"  • {h}")
print()

print("⏳ Handlers à intégrer:")
for handler, contract_type in CONTRACT_TYPE_MAPPING.items():
    if handler not in ALREADY_INTEGRATED:
        print(f"  • {handler} → '{contract_type}'")

print()
print("⚠️  Ce script nécessite une modification manuelle complexe.")
print("💡 Recommandation: Utiliser un approach par sous-agent pour appliquer le pattern à chaque handler.")
