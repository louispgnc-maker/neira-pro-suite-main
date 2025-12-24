#!/usr/bin/env python3
"""
Script pour intégrer l'IA aux 18 handlers restants
"""

import re
import shutil
from datetime import datetime

# Les 18 handlers restants + leur contractType
TARGETS = {
    'handleActeNotorieteSubmit': 'Acte de notoriété',
    'handleActeVenteSubmit': 'Acte de vente',
    'handleAttestationSubmit': 'Attestation',
    'handleBailCommercialSubmit': 'Bail commercial',
    'handleBailHabitationSubmit': 'Bail habitation',
    'handleCessionPartsSubmit': 'Cession de parts',
    'handleChangementRegimeSubmit': 'Changement de régime matrimonial',
    'handleContratMariageSubmit': 'Contrat de mariage',
    'handleDonationEntreEpouxSubmit': 'Donation entre époux',
    'handleDonationSimpleSubmit': 'Donation simple',
    'handleIndivisionSubmit': 'Indivision',
    'handleLicenceLogicielleSubmit': 'Licence logicielle',
    'handleMainleveeSubmit': 'Mainlevée',
    'handlePacsSubmit': 'PACS',
    'handlePartageSuccessoralSubmit': 'Partage successoral',
    'handleQuestionnaireSubmit': 'Questionnaire',  # À vérifier
    'handleSuccessionSubmit': 'Succession',
    'handleTestamentSubmit': 'Testament authentique',
}

def backup(path):
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f'{path}.backup2_{ts}'
    shutil.copy2(path, backup_path)
    print(f"💾 Backup: {backup_path}")
    return backup_path

def integrate_ai(content, handler_name, contract_type):
    """Intègre l'IA dans un handler"""
    
    # Pattern: trouver le handler et son .insert()
    pattern = rf'(const {handler_name} = async \(\) => \{{[\s\S]*?)(await supabase\s*\.from\([\'"]contrats[\'"]\)\s*\.insert\(\{{)'
    
    match = re.search(pattern, content)
    if not match:
        return None, "Handler ou .insert() non trouvé"
    
    # Vérifier que generateContractWithAI n'existe pas déjà
    if 'generateContractWithAI' in match.group(1):
        return None, "IA déjà intégrée"
    
    # Code IA à insérer
    ai_code = f'''
      // Génération du contrat par l'IA
      toast.info("Génération du contrat par l'IA...");
      const clientInfo = getClientInfo(null, clients);
      const generatedContract = await generateContractWithAI({{
        contractType: "{contract_type}",
        formData: {{ /* données */ }},
        clientInfo,
        user
      }});

      '''
    
    # Insérer avant le .insert()
    new_content = content.replace(match.group(0), match.group(1) + ai_code + match.group(2))
    
    # Maintenant, trouver et remplacer content: dans le .insert()
    # On cherche le .insert() de ce handler spécifiquement
    insert_pattern = rf'{re.escape(match.group(2))}[\s\S]*?\.select\(\)'
    insert_match = re.search(insert_pattern, new_content[match.start():match.start()+10000])
    
    if insert_match:
        insert_block = insert_match.group(0)
        # Remplacer content/description par generatedContract
        if 'content:' in insert_block or 'description:' in insert_block:
            modified_block = re.sub(
                r'(content|description):\s*[^,}\n]+',
                r'content: generatedContract',
                insert_block,
                count=1
            )
        else:
            # Ajouter après role:
            modified_block = re.sub(
                r'(role:\s*role,)',
                r'\1\n          content: generatedContract,',
                insert_block,
                count=1
            )
        
        new_content = new_content[:match.start()] + new_content[match.start():match.start()+10000].replace(insert_block, modified_block, 1) + new_content[match.start()+10000:]
    
    return new_content, "✅ Modifié"

def main():
    print("🤖 Intégration IA aux 18 handlers restants\n")
    
    path = 'src/pages/Contrats.tsx'
    backup(path)
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    success = 0
    failed = []
    
    for handler, contract_type in TARGETS.items():
        new_content, status = integrate_ai(content, handler, contract_type)
        
        if new_content:
            content = new_content
            success += 1
            print(f"✅ {handler} → '{contract_type}'")
        else:
            failed.append((handler, status))
            print(f"⏭️  {handler} - {status}")
    
    # Sauvegarder
    if success > 0:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✅ {success} handlers intégrés")
        if failed:
            print(f"⚠️  {len(failed)} échecs")
    else:
        print("\n⚠️  Aucune modification")

if __name__ == '__main__':
    main()
