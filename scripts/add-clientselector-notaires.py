#!/usr/bin/env python3
"""
Script pour ajouter ClientSelector à tous les formulaires notaires qui n'en ont pas encore.
"""

import re

# Liste des contrats notaires sans ClientSelector (selon l'analyse du subagent)
CONTRACTS_TO_UPDATE = [
    {
        "name": "Convention d'indivision",
        "start_line": 34546,
        "client_field": "clientId"  # Nom du champ dans questionnaireData
    },
    {
        "name": "Mainlevée d'hypothèque",
        "start_line": 36339,
        "client_field": "clientId"
    },
    {
        "name": "Contrat de mariage (régimes matrimoniaux)",
        "start_line": 38035,
        "client_field": "clientId"
    },
    {
        "name": "PACS (convention + enregistrement)",
        "start_line": 40062,
        "client_field": "clientId"
    },
    {
        "name": "Donation entre époux",
        "start_line": 41631,
        "client_field": "donateurClientId"  # Spécifique: il y a donateur ET donataire
    },
    {
        "name": "Donation simple (parent → enfant, etc.)",
        "start_line": 44188,
        "client_field": "donateurClientId"
    },
    {
        "name": "Testament authentique ou mystique",
        "start_line": 48245,
        "client_field": "testateurClientId"
    },
    {
        "name": "Changement de régime matrimonial",
        "start_line": 51667,
        "client_field": "epoux1ClientId"  # Il y a epoux1 et epoux2
    },
    {
        "name": "Déclaration de succession",
        "start_line": 52744,
        "client_field": "defuntClientId"  # Le défunt peut être un client
    },
    {
        "name": "Acte de notoriété",
        "start_line": 53714,
        "client_field": "defuntClientId"
    },
    {
        "name": "Partage successoral",
        "start_line": 54951,
        "client_field": "defuntClientId"
    },
    {
        "name": "Procuration authentique",
        "start_line": 57995,
        "client_field": "mandantClientId"  # Mandant = celui qui donne procuration
    },
    {
        "name": "Mandat de protection future",
        "start_line": 59093,
        "client_field": "mandantClientId"
    },
    {
        "name": "Attestation de propriété immobilière",
        "start_line": 61660,
        "client_field": "proprietaireClientId"
    },
    {
        "name": "Quitus / reconnaissance de dette",
        "start_line": 63494,
        "client_field": "debiteurClientId"  # Débiteur = celui qui doit
    },
    {
        "name": "Acte de cession de parts sociales",
        "start_line": 65590,
        "client_field": "cedantClientId"  # Cédant = celui qui cède
    },
]

print(f"📋 Script d'ajout ClientSelector pour {len(CONTRACTS_TO_UPDATE)} formulaires notaires")
print("\nCe script nécessite une intervention manuelle car chaque formulaire est différent.")
print("\nPour chaque formulaire, il faut:")
print("1. Trouver le premier champ de formulaire (généralement après la ligne contractType === '...')")
print("2. Ajouter le ClientSelector AVANT ce premier champ")
print("3. Adapter le nom du champ (clientId, donateurClientId, etc.)")
print("\n" + "="*80)

for i, contract in enumerate(CONTRACTS_TO_UPDATE, 1):
    print(f"\n{i}. {contract['name']}")
    print(f"   Ligne approximative: ~{contract['start_line']}")
    print(f"   Champ à utiliser: questionnaireData.{contract['client_field']}")
    print(f"   Label suggéré: 'Sélectionner votre client'")

print("\n" + "="*80)
print("\n⚠️  ATTENTION: Ce script liste les formulaires à modifier.")
print("Pour modifier le fichier, utilisez l'outil replace_string_in_file de VS Code.")
print("\n✅ Prêt à procéder avec les modifications manuelles.")
