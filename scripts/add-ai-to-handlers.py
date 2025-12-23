#!/usr/bin/env python3
"""
Script pour ajouter l'appel IA à tous les handlers de contrats
"""
import re

# Lire le fichier
with open('src/pages/Contrats.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern de tous les handlers qui n'ont PAS encore l'IA
# On cherche les patterns .insert({ qui ne sont PAS précédés de generateContractWithAI

handlers_to_update = [
    {
        "name": "Licence logicielle",
        "type": "Contrat de licence de logiciel",
        "data_var": "licenceLogicielleData",
        "client_field": "licencieClientId",
        "files_data": "{ documentation: documentationUrls, cahierCharges: cahierChargesUrls, exemplesInterface: exemplesInterfaceUrls }",
        "search_pattern": r'(for \(const file of licenceLogicielleExemplesInterface\) \{.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n      \})\n\n      (const \{ data, error \} = await supabase\n        \.from\(\'contrats\'\)\n        \.insert\(\{\n          owner_id: user\.id,\n          name: "Licence logicielle",)',
        "insert_before": "const { data, error } = await supabase"
    },
    # ... autres handlers
]

# Pour chaque handler, on insère le code d'appel IA juste avant .from('contrats').insert({

for handler in handlers_to_update:
    search = f'const {{ data, error }} = await supabase\n        .from(\'contrats\')\n        .insert({{\n          owner_id: user.id,\n          name: "{handler["name"]}",'
    
    if search in content:
        ai_code = f'''// Génération IA
      toast.info("Génération du contrat par l'IA...");
      const clientInfo = getClientInfo({handler["data_var"]}.{handler["client_field"]}, clients);
      const generatedContract = await generateContractWithAI({{
        contractType: "{handler["type"]}",
        formData: {{ ...{handler["data_var"]}, fichiers: {handler["files_data"]} }},
        clientInfo,
        user
      }});

      '''
        
        replacement = ai_code + search
        content = content.replace(search, replacement, 1)
        
        # Ajouter content: generatedContract dans l'insert
        # Trouver le contenu_json et ajouter content juste après
        print(f"✓ Modifié: {handler['name']}")

# Écrire le fichier
with open('src/pages/Contrats.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Terminé!")
