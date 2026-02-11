#!/bin/bash

# Script pour synchroniser Stripe et Supabase pour contact@neira.fr

echo "🔄 Synchronisation Stripe <-> Supabase pour contact@neira.fr"
echo ""

# Annuler l'ancien abonnement Essentiel sur Stripe via CLI
echo "🗑️  Étape 1: Annulation de l'abonnement Essentiel sur Stripe..."
echo "Veuillez exécuter cette commande manuellement dans Stripe Dashboard:"
echo "   Abonnements → contact@neira.fr → NEIRA Essentiel → Annuler"
echo ""

# Mettre à jour Supabase via SQL
echo "💾 Étape 2: Mise à jour de Supabase..."
echo "Exécutez le fichier fix-contact-neira-subscription.sql dans SQL Editor"
echo ""

echo "📋 Résumé des actions nécessaires:"
echo "   1. ❌ Annuler sur Stripe: NEIRA Essentiel (45€/mois)"
echo "   2. ✅ Garder sur Stripe: NEIRA Professionnel (138€/mois)"  
echo "   3. 💾 Exécuter SQL: fix-contact-neira-subscription.sql"
echo ""
echo "Après ces étapes, tout sera synchronisé ! 🎉"
