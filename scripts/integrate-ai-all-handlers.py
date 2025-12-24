#!/usr/bin/env python3
"""
Script pour intégrer automatiquement ChatGPT à TOUS les handlers de contrats
"""

import re
import sys

# Mapping complet: handler -> (contractType, clientFieldName)
HANDLERS_TO_INTEGRATE = {
    # ============ NOTAIRES ============
    'handleCompromisVenteSubmit': ('Compromis de vente', 'compromisVenteData.vendeurClientId'),
    'handleActeVenteSubmit': ('Acte de vente', 'acteVenteData.vendeurClientId'),
    'handleBailHabitationSubmit': ('Bail habitation', 'bailHabitationData.bailleurClientId'),
    'handleBailCommercialSubmit': ('Bail commercial', 'bailCommercialData.bailleurClientId'),
    'handleIndivisionSubmit': ('Indivision', 'indivisionData.indivisaire1ClientId'),
    'handleMainleveeSubmit': ('Mainlevée', 'mainleveeData.beneficiaireClientId'),
    'handleContratMariageSubmit': ('Contrat de mariage', 'contratMariageData.epoux1ClientId'),
    'handlePacsSubmit': ('PACS', 'pacsData.partenaire1ClientId'),
    'handleDonationEntreEpouxSubmit': ('Donation entre époux', 'donationEntreEpouxData.donateurClientId'),
    'handleDonationSimpleSubmit': ('Donation simple', 'donationSimpleData.donateurClientId'),
    'handleTestamentSubmit': ('Testament authentique', 'testamentData.testateurClientId'),
    'handleChangementRegimeSubmit': ('Changement de régime matrimonial', 'changementRegimeData.epoux1ClientId'),
    'handleSuccessionSubmit': ('Succession', 'successionData.defuntClientId'),
    'handleActeNotorieteSubmit': ('Acte de notoriété', 'acteNotorieteData.defuntClientId'),
    'handlePartageSuccessoralSubmit': ('Partage successoral', 'partageSuccessoralData.succession.defunt.clientId'),
    'handleProcurationSubmit': ('Procuration', 'procurationData.mandantClientId'),
    'handleMandatProtectionSubmit': ('Mandat de protection future', 'mandatProtectionData.mandantClientId'),
    'handleAttestationSubmit': ('Attestation', 'attestationData.declarantClientId'),
    'handleQuitusDetteSubmit': ('Quitus de dette', 'quitusDetteData.creancierClientId'),
    'handleCessionPartsSubmit': ('Cession de parts', 'cessionPartsData.cedantClientId'),
    
    # ============ AVOCATS ============
    'handleGenericContractSubmit': ('Contrat de prestation de services', 'prestataireClientId'),
    'handleCGUSubmit': ('CGU', 'cguData.denominationSociale'),
    'handleAgenceCommercialeSubmit': ('Agence commerciale', 'agenceCommercialeData.mandantClientId'),
    'handleNDASubmit': ('NDA', 'ndaData.partie1ClientId'),
    'handleBailHabitationSubmit': ('Bail habitation', 'bailHabitationData.bailleurClientId'),
    'handleMiseEnDemeureSubmit': ('Mise en demeure', 'miseEnDemeureData.expediteurClientId'),
    'handlePacteConcubinageSubmit': ('Pacte de concubinage', 'pacteConcubinageData.concubin1ClientId'),
    'handleConventionParentaleSubmit': ('Convention parentale', 'conventionParentaleData.parent1ClientId'),
    'handleReconnaissanceDetteSubmit': ('Reconnaissance de dette', 'reconnaissanceDetteData.debiteurClientId'),
    'handleMandatProtectionSousSeingSubmit': ('Mandat de protection sous seing privé', 'mandatProtectionSousSeingData.mandantClientId'),
    'handleTestamentOlographeSubmit': ('Testament olographe', 'testamentOlographeData.testateurClientId'),
}

# Handlers déjà intégrés (ne pas modifier)
SKIP_HANDLERS = [
    'handleDevWebAppSubmit',
    'handleCessionDroitsAuteurSubmit',
    'handleLicenceLogicielleSubmit',
    'handleMentionsLegalesSubmit',
    'handleEtatLieuxSubmit'  # Déjà modifié récemment
]

def apply_ai_to_handler(content, handler_name, contract_type, client_field):
    """
    Applique le pattern AI à un handler spécifique
    """
    
    # Pattern pour trouver le début du handler
    handler_pattern = rf'(const {handler_name} = async \(\) => {{[\s\S]*?)(\.insert\({{)'
    
    match = re.search(handler_pattern, content)
    if not match:
        print(f"  ⚠️  Handler {handler_name} non trouvé ou format inattendu")
        return content
    
    # Vérifier si l'IA est déjà intégrée
    if 'generateContractWithAI' in match.group(1):
        print(f"  ⏭️  {handler_name} - IA déjà intégrée")
        return content
    
    # Code AI à insérer AVANT le .insert()
    ai_code = f'''
      // Génération du contrat par l'IA
      toast.info("Génération du contrat par l'IA...");
      const clientInfo = getClientInfo({client_field}, clients);
      const generatedContract = await generateContractWithAI({{
        contractType: "{contract_type}",
        formData: {{ /* handler data */ }},
        clientInfo,
        user
      }});

      '''
    
    # Remplacer
    new_content = content.replace(
        match.group(0),
        match.group(1) + ai_code + match.group(2)
    )
    
    # Maintenant, trouver le champ content/description dans le .insert() et le remplacer
    # Pattern pour trouver le .insert() de ce handler
    insert_pattern = rf'({re.escape(match.group(2))}[\s\S]*?content:.*?)(,|\}})'
    
    insert_match = re.search(insert_pattern, new_content[match.start():])
    if insert_match:
        # Remplacer content: ... par content: generatedContract
        new_content = re.sub(
            r'content:\s*[^,}]+',
            'content: generatedContract',
            new_content,
            count=1
        )
    
    print(f"  ✅ {handler_name} → '{contract_type}'")
    return new_content

def main():
    print("🤖 Intégration automatique de ChatGPT à tous les handlers de contrats\n")
    
    # Lire le fichier
    try:
        with open('src/pages/Contrats.tsx', 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print("❌ Erreur: fichier src/pages/Contrats.tsx non trouvé")
        return 1
    
    original_content = content
    modified_count = 0
    
    # Appliquer l'IA à chaque handler
    for handler_name, (contract_type, client_field) in HANDLERS_TO_INTEGRATE.items():
        if handler_name in SKIP_HANDLERS:
            print(f"  ⏭️  {handler_name} - Déjà intégré (skip)")
            continue
        
        new_content = apply_ai_to_handler(content, handler_name, contract_type, client_field)
        if new_content != content:
            modified_count += 1
            content = new_content
    
    # Sauvegarder si des modifications ont été faites
    if content != original_content:
        with open('src/pages/Contrats.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"\n✅ Script terminé: {modified_count} handlers modifiés")
        print(f"📝 Fichier src/pages/Contrats.tsx mis à jour")
        return 0
    else:
        print("\n⚠️  Aucune modification effectuée")
        return 1

if __name__ == '__main__':
    sys.exit(main())
