#!/usr/bin/env python3
"""
Script pour remplacer tous les Select par ClientSelector dans les formulaires notaires.
Ce script identifie les Select qui utilisent clients.map() et les remplace par ClientSelector
tout en préservant la logique de onValueChange existante.
"""

import re

# Lire le fichier
with open('src/pages/Contrats.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern pour trouver les Select avec clients.map() dans les formulaires notaires
# On cherche après la ligne 15000 (début des formulaires notaires)
lines = content.split('\n')

def find_select_blocks():
    """Trouve tous les blocs Select qui ont clients.map()"""
    blocks = []
    i = 15000  # Commence après les formulaires avocats
    
    while i < len(lines):
        line = lines[i]
        
        # Chercher le début d'un Select avec onValueChange
        if '<Select' in line and i < len(lines) - 50:
            # Vérifier si ce Select utilise clients.map() dans les 50 lignes suivantes
            has_clients_map = False
            end_index = -1
            
            for j in range(i, min(i + 50, len(lines))):
                if 'clients.map(' in lines[j]:
                    has_clients_map = True
                if '</Select>' in lines[j]:
                    end_index = j
                    break
            
            if has_clients_map and end_index > i:
                blocks.append((i, end_index))
                i = end_index + 1
                continue
        
        i += 1
    
    return blocks

# Trouver les blocs
blocks = find_select_blocks()
print(f"Trouvé {len(blocks)} blocs Select à remplacer")

for start, end in blocks:
    print(f"  Ligne {start+1} - {end+1}")

print(f"\nTotal: {len(blocks)} remplacements nécessaires")
print("Note: Ce script est une analyse uniquement. Les remplacements doivent être faits manuellement")
print("pour préserver la logique métier complexe de chaque formulaire.")
