#!/bin/bash

echo "🔧 Configuration du compte de test denis@neira.test"
echo "   - Rôle: Avocat"
echo "   - Abonnement: Cabinet-Plus (illimité)"
echo ""

# Récupérer les credentials Supabase
PROJECT_REF="elysrdqujzlbvnjfilvh"
DB_URL=$(supabase status --output json 2>/dev/null | jq -r '.DB_URL // empty')

if [ -z "$DB_URL" ]; then
    echo "⚠️  Supabase local non démarré, utilisation de la prod..."
    DB_URL="postgresql://postgres.elysrdqujzlbvnjfilvh:Neira2026!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
fi

echo "📊 Exécution du script SQL..."
psql "$DB_URL" -f configure-denis-account.sql

echo ""
echo "✅ Configuration terminée !"
echo ""
echo "🔐 Connexion:"
echo "   Email: denis@neira.test"
echo "   URL: https://neira.fr/avocats/login"
echo ""
echo "📋 Le compte a maintenant:"
echo "   ✓ Accès espace Avocat"
echo "   ✓ Abonnement Cabinet-Plus actif"
echo "   ✓ Membres illimités"
echo "   ✓ Signatures illimitées"
