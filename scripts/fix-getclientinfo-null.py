#!/usr/bin/env python3
"""
Script pour fixer automatiquement tous les getClientInfo(null, clients) 
dans Contrats.tsx en utilisant le bon clientId depuis formData.
"""

import re

# Liste des replacements à faire (déjà fixés: Cession parts, Attestation, Questionnaire)
FIXES = [
    {
        "old": '      const clientInfo = getClientInfo(null, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Bail habitation",',
        "new": '      const clientInfo = getClientInfo(bailHabitationData.bailleurClientId || bailHabitationData.locataireClientId, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Bail habitation",'
    },
    {
        "old": '      const clientInfo = getClientInfo(null, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Bail commercial",',
        "new": '      const clientInfo = getClientInfo(bailCommercialData.bailleurClientId || bailCommercialData.locataireClientId, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Bail commercial",'
    },
    {
        "old": '      const clientInfo = getClientInfo(null, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Convention d\'indivision",',
        "new": '      const clientInfo = getClientInfo(indivisionData.indivisaires?.find(i => i.clientId)?.clientId, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Convention d\'indivision",'
    },
    {
        "old": '      const clientInfo = getClientInfo(null, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Acte de mainlevée",',
        "new": '      const clientInfo = getClientInfo(mainleveeData.debiteurs?.find(d => d.clientId)?.clientId, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Acte de mainlevée",'
    },
    {
        "old": '      const clientInfo = getClientInfo(null, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Contrat de mariage",',
        "new": '      const clientInfo = getClientInfo(contratMariageData.epoux?.[0]?.clientId || contratMariageData.epoux?.[1]?.clientId, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Contrat de mariage",'
    },
    {
        "old": '      const clientInfo = getClientInfo(null, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Pacte civil de solidarité (PACS)",',
        "new": '      const clientInfo = getClientInfo(pacsData.partenaires?.[0]?.clientId || pacsData.partenaires?.[1]?.clientId, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Pacte civil de solidarité (PACS)",'
    },
    {
        "old": '      const clientInfo = getClientInfo(null, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Donation entre époux",',
        "new": '      const clientInfo = getClientInfo(donationEntreEpouxData.epoux?.[0]?.clientId || donationEntreEpouxData.epoux?.[1]?.clientId, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Donation entre époux",'
    },
    {
        "old": '      const clientInfo = getClientInfo(null, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Donation simple",',
        "new": '      const clientInfo = getClientInfo(donationSimpleData.donateur?.clientId || donationSimpleData.donataire?.clientId, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Donation simple",'
    },
    {
        "old": '      const clientInfo = getClientInfo(null, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Testament",',
        "new": '      const clientInfo = getClientInfo(testamentData.clientId, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Testament",'
    },
    {
        "old": '      const clientInfo = getClientInfo(null, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Déclaration de succession",',
        "new": '      const clientInfo = getClientInfo(successionData.defuntClientId, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Déclaration de succession",'
    },
    {
        "old": '      const clientInfo = getClientInfo(null, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Acte de notoriété",',
        "new": '      const clientInfo = getClientInfo(acteNotorieteData.defuntClientId, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Acte de notoriété",'
    },
    {
        "old": '      const clientInfo = getClientInfo(null, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Acte de partage successoral",',
        "new": '      const clientInfo = getClientInfo(partageSuccessoralData.defuntClientId, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Acte de partage successoral",'
    },
    {
        "old": '      const clientInfo = getClientInfo(null, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Contrat de licence de logiciel",',
        "new": '      const clientInfo = getClientInfo(licenceLogicielleData.licencieClientId, clients);\n      const generatedContract = await generateContractWithAI({\n        contractType: "Contrat de licence de logiciel",'
    },
]

def main():
    file_path = "/Users/louispgnc/Desktop/neira-pro-suite-main/src/pages/Contrats.tsx"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    count = 0
    for fix in FIXES:
        if fix["old"] in content:
            content = content.replace(fix["old"], fix["new"])
            count += 1
            print(f"✓ Fixed: {fix['new'].split('contractType:')[1].split(',')[0].strip()}")
        else:
            print(f"✗ Not found: {fix['old'][:80]}...")
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"\n{count}/{len(FIXES)} replacements successful")

if __name__ == "__main__":
    main()
