#!/bin/bash

# 🚀 Script de déploiement de la fonction Edge cancel-subscription

set -e

echo "📦 Déploiement de la fonction cancel-subscription..."

npx supabase functions deploy cancel-subscription \
  --project-ref oybabixbdfjhbsutquzg \
  --no-verify-jwt

echo ""
echo "✅ Fonction cancel-subscription déployée avec succès!"
echo ""
echo "🔗 Endpoint disponible à:"
echo "   https://oybabixbdfjhbsutquzg.supabase.co/functions/v1/cancel-subscription"
echo ""
echo "🔒 Cette fonction vérifie l'engagement de 12 mois avant d'autoriser l'annulation"
