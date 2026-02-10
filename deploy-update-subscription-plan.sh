#!/bin/bash

# 🚀 Script de déploiement de la fonction Edge update-subscription-plan

set -e

echo "📦 Déploiement de la fonction update-subscription-plan..."

npx supabase functions deploy update-subscription-plan \
  --project-ref elysrdqujzlbvnjfilvh

echo ""
echo "✅ Fonction update-subscription-plan déployée avec succès!"
echo ""
echo "🔗 Endpoint disponible à:"
echo "   https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/update-subscription-plan"
echo ""
echo "🎯 Cette fonction:"
echo "   - Met à jour le plan sans réinitialiser la période d'essai"
echo "   - Conserve la date de fin d'essai originale"
echo "   - Applique le prorata uniquement hors essai"
