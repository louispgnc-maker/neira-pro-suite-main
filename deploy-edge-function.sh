#!/bin/bash
# Script pour déployer l'Edge Function share-and-copy

echo "🚀 Déploiement de l'Edge Function share-and-copy..."

npx supabase functions deploy share-and-copy

if [ $? -eq 0 ]; then
  echo "✅ Déploiement réussi !"
  echo "Les documents partagés utilisent maintenant des URLs permanentes."
else
  echo "❌ Erreur lors du déploiement"
  exit 1
fi
