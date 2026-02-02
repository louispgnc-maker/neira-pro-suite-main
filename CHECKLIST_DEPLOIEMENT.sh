#!/bin/bash

# ============================================================
# CHECKLIST DE DÉPLOIEMENT - Pipeline de Création de Contrats
# ============================================================
#
# Ce script guide le déploiement étape par étape
# Usage: ./CHECKLIST_DEPLOIEMENT.sh
#
# ============================================================

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   CHECKLIST DE DÉPLOIEMENT - Pipeline de Contrats         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Fonction pour demander confirmation
confirm() {
    read -p "✓ $1 [o/N] " response
    if [[ ! "$response" =~ ^[oO]$ ]]; then
        echo "❌ Étape non validée - arrêt du script"
        exit 1
    fi
}

# Fonction pour vérifier une commande
check_command() {
    if command -v $1 &> /dev/null; then
        echo "  ✅ $1 installé"
        return 0
    else
        echo "  ❌ $1 non installé"
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "ÉTAPE 1/6: Vérification des prérequis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_command "supabase" || {
    echo ""
    echo "⚠️  Installez Supabase CLI avec:"
    echo "    brew install supabase/tap/supabase"
    exit 1
}

check_command "node" || {
    echo ""
    echo "⚠️  Node.js requis"
    exit 1
}

echo ""
confirm "Prérequis vérifiés ?"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "ÉTAPE 2/6: Connexion à Supabase"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if supabase projects list &> /dev/null; then
    echo "✅ Connecté à Supabase"
else
    echo "❌ Non connecté à Supabase"
    echo ""
    echo "Exécutez:"
    echo "  supabase login"
    exit 1
fi

echo ""
confirm "Connexion à Supabase vérifiée ?"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "ÉTAPE 3/6: Déploiement des Edge Functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Déploiement de clarify-contract-request..."
if ./deploy-contract-pipeline-functions.sh; then
    echo "✅ Edge Functions déployées"
else
    echo "❌ Échec du déploiement"
    exit 1
fi

echo ""
confirm "Edge Functions déployées avec succès ?"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "ÉTAPE 4/6: Création de la table BDD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Application de la migration..."
if supabase db push; then
    echo "✅ Table contract_pipeline_states créée"
else
    echo "⚠️  Échec - Appliquez manuellement la migration"
    echo "   Fichier: supabase/migrations/create_pipeline_states_table.sql"
fi

echo ""
confirm "Table créée avec succès ?"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "ÉTAPE 5/6: Configuration OPENAI_API_KEY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Vérifiez que OPENAI_API_KEY est configurée:"
echo ""
echo "1. Ouvrez le Dashboard Supabase"
echo "2. Allez dans Settings → Edge Functions"
echo "3. Vérifiez que OPENAI_API_KEY existe"
echo "4. Si manquante, ajoutez-la:"
echo "   OPENAI_API_KEY = sk-proj-..."
echo ""

confirm "OPENAI_API_KEY configurée ?"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "ÉTAPE 6/6: Intégration UI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Fichiers à modifier:"
echo ""
echo "1. src/components/dashboard/ContractCreationDialog.tsx"
echo "   → Voir EXEMPLE_INTEGRATION_PIPELINE.tsx"
echo ""
echo "2. src/pages/Contrats.tsx"
echo "   → Récupérer le schéma du sessionStorage"
echo ""
echo "Documentation:"
echo "  • EXEMPLE_INTEGRATION_PIPELINE.tsx (code d'exemple)"
echo "  • QUICK_START_PIPELINE.md (guide complet)"
echo ""

confirm "Intégration UI effectuée ?"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   ✅ DÉPLOIEMENT TERMINÉ                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo "📋 RÉCAPITULATIF:"
echo ""
echo "✅ Edge Functions déployées"
echo "   • clarify-contract-request"
echo "   • audit-form-schema"
echo ""
echo "✅ Table créée"
echo "   • contract_pipeline_states"
echo ""
echo "✅ Configuration vérifiée"
echo "   • OPENAI_API_KEY"
echo ""
echo "✅ Code intégré"
echo "   • ContractPipelineFlow"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PROCHAINES ÉTAPES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣ TESTER"
echo "   • Créer un contrat via l'interface"
echo "   • Vérifier le flow complet"
echo "   • Vérifier les logs (F12)"
echo ""
echo "2️⃣ MONITORER"
echo "   • Console navigateur pour logs client"
echo "   • supabase functions logs --tail pour logs serveur"
echo ""
echo "3️⃣ DOCUMENTER"
echo "   • Lire PIPELINE_CREATION_CONTRATS.md"
echo "   • Former l'équipe"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 DOCUMENTATION:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "• README_PIPELINE.md                 - Vue d'ensemble"
echo "• QUICK_START_PIPELINE.md            - Démarrage rapide"
echo "• PIPELINE_CREATION_CONTRATS.md      - Documentation complète"
echo "• EXEMPLE_INTEGRATION_PIPELINE.tsx   - Exemple de code"
echo "• INDEX_PIPELINE.md                  - Index général"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 COMMANDES UTILES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "# Voir les logs en temps réel"
echo "supabase functions logs clarify-contract-request --tail"
echo "supabase functions logs audit-form-schema --tail"
echo ""
echo "# Lister les fonctions déployées"
echo "supabase functions list"
echo ""
echo "# Redéployer si modifs"
echo "./deploy-contract-pipeline-functions.sh"
echo ""

echo "🎉 Félicitations - Le pipeline est prêt !"
echo ""
