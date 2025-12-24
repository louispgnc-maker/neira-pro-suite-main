#!/usr/bin/env python3
"""
Script ROBUSTE pour intégrer ChatGPT à TOUS les handlers de contrats
Avec backup automatique et vérifications de sécurité
"""

import re
import shutil
from datetime import datetime

# Mapping: handler -> (contractType, exemple de champ client)
HANDLERS_CONFIG = {
    # NOTAIRES
    'handleCompromisVenteSubmit': 'Compromis de vente',
    'handleActeVenteSubmit': 'Acte de vente',
    'handleBailHabitationSubmit': 'Bail habitation',
    'handleBailCommercialSubmit': 'Bail commercial',
    'handleIndivisionSubmit': 'Indivision',
    'handleMainleveeSubmit': 'Mainlevée',
    'handleContratMariageSubmit': 'Contrat de mariage',
    'handlePacsSubmit': 'PACS',
    'handleDonationEntreEpouxSubmit': 'Donation entre époux',
    'handleDonationSimpleSubmit': 'Donation simple',
    'handleTestamentSubmit': 'Testament authentique',
    'handleChangementRegimeSubmit': 'Changement de régime matrimonial',
    'handleSuccessionSubmit': 'Succession',
    'handleActeNotorieteSubmit': 'Acte de notoriété',
    'handlePartageSuccessoralSubmit': 'Partage successoral',
    'handleProcurationSubmit': 'Procuration',
    'handleMandatProtectionSubmit': 'Mandat de protection future',
    'handleAttestationSubmit': 'Attestation',
    'handleQuitusDetteSubmit': 'Quitus de dette',
    'handleCessionPartsSubmit': 'Cession de parts',
    
    # AVOCATS
    'handleGenericContractSubmit': 'Contrat de prestation de services',
    'handleCGUSubmit': 'CGU',
    'handleAgenceCommercialeSubmit': 'Agence commerciale',
    'handleNDASubmit': 'NDA',
    'handleMiseEnDemeureSubmit': 'Mise en demeure',
    'handlePacteConcubinageSubmit': 'Pacte de concubinage',
    'handleConventionParentaleSubmit': 'Convention parentale',
    'handleReconnaissanceDetteSubmit': 'Reconnaissance de dette',
    'handleMandatProtectionSousSeingSubmit': 'Mandat de protection sous seing privé',
    'handleTestamentOlographeSubmit': 'Testament olographe',
}

# Handlers à ne PAS toucher (déjà intégrés)
SKIP = ['handleDevWebAppSubmit', 'handleCessionDroitsAuteurSubmit', 'handleLicenceLogicielleSubmit', 'handleMentionsLegalesSubmit', 'handleEtatLieuxSubmit']

def create_backup(filepath):
    """Crée un backup du fichier"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f'{filepath}.backup_{timestamp}'
    shutil.copy2(filepath, backup_path)
    print(f"💾 Backup créé: {backup_path}")
    return backup_path

def find_handler_insert_block(content, handler_name):
    """
    Trouve le bloc .insert() d'un handler spécifique
    Retourne (start_pos, end_pos, insert_content) ou None
    """
    # Pattern pour trouver le handler
    handler_pattern = rf'const {handler_name} = async \(\) => \{{'
    handler_match = re.search(handler_pattern, content)
    
    if not handler_match:
        return None
    
    handler_start = handler_match.start()
    
    # Chercher le .insert() dans ce handler
    # On cherche depuis le début du handler jusqu'au prochain handler ou la fin
    next_handler = re.search(r'const handle\w+Submit = async \(\) => \{', content[handler_start + 100:])
    handler_end = handler_start + 100 + next_handler.start() if next_handler else len(content)
    
    handler_content = content[handler_start:handler_end]
    
    # Trouver le .insert() dans ce handler
    insert_pattern = r'(await supabase\s*\.from\([\'"]contrats[\'"]\)\s*\.insert\(\{)'
    insert_match = re.search(insert_pattern, handler_content)
    
    if not insert_match:
        return None
    
    # Position absolue dans le fichier
    insert_start = handler_start + insert_match.start()
    
    # Trouver la fin du .insert() (le .select() ou .single())
    remaining = content[insert_start:]
    # Trouver le })}  qui termine l'insert
    bracket_count = 0
    in_insert = False
    insert_end = insert_start
    
    for i, char in enumerate(remaining):
        if char == '{':
            bracket_count += 1
            in_insert = True
        elif char == '}':
            bracket_count -= 1
            if in_insert and bracket_count == 0:
                insert_end = insert_start + i + 1
                break
    
    return insert_start, insert_end, content[insert_start:insert_end]

def apply_ai_to_handler(content, handler_name, contract_type):
    """
    Applique le pattern AI à un handler
    Retourne le contenu modifié ou None si échec
    """
    
    # Vérifier si déjà intégré
    handler_pattern = rf'const {handler_name} = async \(\) => \{{'
    handler_match = re.search(handler_pattern, content)
    if not handler_match:
        return None
    
    # Chercher dans les 5000 caractères suivants si generateContractWithAI existe déjà
    handler_section = content[handler_match.start():handler_match.start() + 5000]
    if 'generateContractWithAI' in handler_section:
        return None  # Déjà intégré
    
    # Trouver le .insert()
    result = find_handler_insert_block(content, handler_name)
    if not result:
        return None
    
    insert_start, insert_end, insert_block = result
    
    # Code AI à insérer AVANT le .insert()
    ai_code = f'''
      // Génération du contrat par l'IA
      toast.info("Génération du contrat par l'IA...");
      const clientInfo = getClientInfo(null, clients); // Sera adapté selon le handler
      const generatedContract = await generateContractWithAI({{
        contractType: "{contract_type}",
        formData: {{ /* données du formulaire */ }},
        clientInfo,
        user
      }});

      '''
    
    # Insérer le code AI avant le .insert()
    new_content = content[:insert_start] + ai_code + content[insert_start:]
    
    # Maintenant modifier le champ content dans le .insert()
    # Chercher "content:" ou "description:" dans le bloc insert
    # et le remplacer par generatedContract
    
    # Recalculer la position du insert après injection
    new_insert_start = insert_start + len(ai_code)
    new_insert_end = insert_end + len(ai_code)
    
    # Extraire le nouveau bloc insert
    new_insert_block = new_content[new_insert_start:new_insert_end]
    
    # Remplacer content: "..." ou description: "..." par content: generatedContract
    modified_insert = re.sub(
        r'(content|description):\s*["\'][^"\']*["\']',
        'content: generatedContract',
        new_insert_block,
        count=1
    )
    
    # Si pas de content/description, on cherche juste après role: et on ajoute
    if modified_insert == new_insert_block:
        # Pas de content trouvé, on l'ajoute après role:
        modified_insert = re.sub(
            r'(role:\s*role,)',
            r'\1\n          content: generatedContract,',
            new_insert_block,
            count=1
        )
    
    # Remplacer le bloc insert
    final_content = new_content[:new_insert_start] + modified_insert + new_content[new_insert_end:]
    
    return final_content

def main():
    print("🤖 Intégration automatique de ChatGPT à TOUS les handlers\n")
    
    filepath = 'src/pages/Contrats.tsx'
    
    # Créer backup
    backup_path = create_backup(filepath)
    
    # Lire le fichier
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_length = len(content)
    modified_count = 0
    skipped_count = 0
    failed = []
    
    print("\n📋 Traitement des handlers:\n")
    
    # Traiter chaque handler
    for handler_name, contract_type in HANDLERS_CONFIG.items():
        if handler_name in SKIP:
            print(f"  ⏭️  {handler_name} (déjà intégré)")
            skipped_count += 1
            continue
        
        new_content = apply_ai_to_handler(content, handler_name, contract_type)
        
        if new_content and new_content != content:
            content = new_content
            modified_count += 1
            print(f"  ✅ {handler_name} → '{contract_type}'")
        elif new_content is None:
            failed.append(handler_name)
            print(f"  ❌ {handler_name} - Handler non trouvé ou déjà intégré")
        else:
            print(f"  ⏭️  {handler_name} - Aucune modification nécessaire")
            skipped_count += 1
    
    # Sauvegarder
    if modified_count > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        new_length = len(content)
        diff = new_length - original_length
        
        print(f"\n✅ Terminé!")
        print(f"  • Handlers modifiés: {modified_count}")
        print(f"  • Handlers ignorés: {skipped_count}")
        print(f"  • Échecs: {len(failed)}")
        print(f"  • Taille fichier: {original_length:,} → {new_length:,} (+{diff:,} caractères)")
        print(f"  • Backup: {backup_path}")
        
        if failed:
            print(f"\n⚠️  Handlers en échec (à vérifier manuellement):")
            for h in failed:
                print(f"    - {h}")
    else:
        print("\n⚠️  Aucune modification effectuée")
    
    print("\n✅ Script terminé avec succès!")

if __name__ == '__main__':
    main()
