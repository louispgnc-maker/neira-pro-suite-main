#!/bin/bash

# Script de déploiement des Edge Functions pour le pipeline de création de contrats
# Usage: ./deploy-contract-pipeline-functions.sh

set -e  # Arrêter en cas d'erreur

echo "🚀 Déploiement des Edge Functions du pipeline de création de contrats"
echo "================================================================"

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Erreur: Supabase CLI n'est pas installé"
    echo "   Installez-le avec: brew install supabase/tap/supabase"
    exit 1
fi

# Vérifier qu'on est connecté
if ! supabase projects list &> /dev/null; then
    echo "❌ Erreur: Vous n'êtes pas connecté à Supabase"
    echo "   Connectez-vous avec: supabase login"
    exit 1
fi

echo ""
echo "📦 Déploiement des fonctions..."
echo ""

# Fonction 1: Clarification
echo "1️⃣ Déploiement de clarify-contract-request..."
if supabase functions deploy clarify-contract-request --no-verify-jwt; then
    echo "   ✅ clarify-contract-request déployée"
else
    echo "   ❌ Échec du déploiement de clarify-contract-request"
    exit 1
fi

echo ""

# Fonction 2: Audit qualité
echo "2️⃣ Déploiement de audit-form-schema..."
if supabase functions deploy audit-form-schema --no-verify-jwt; then
    echo "   ✅ audit-form-schema déployée"
else
    echo "   ❌ Échec du déploiement de audit-form-schema"
    exit 1
fi

echo ""
echo "================================================================"
echo "✅ Toutes les fonctions ont été déployées avec succès!"
echo ""
echo "📋 Fonctions déployées:"
echo "   • clarify-contract-request   - Étape 1: Clarification"
echo "   • audit-form-schema          - Étape 4: Audit qualité"
echo ""
echo "ℹ️  La fonction generate-form-schema existe déjà (Étape 3)"
echo "ℹ️  La fonction generate-contract-ai existe déjà (Étape 6)"
echo ""
echo "🔑 Configuration requise:"
echo "   Vérifiez que OPENAI_API_KEY est configurée dans votre projet Supabase"
echo "   Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/functions"
echo ""
echo "📚 Documentation complète:"
echo "   Voir PIPELINE_CREATION_CONTRATS.md"
echo ""
