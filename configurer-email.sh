#!/bin/bash

# Configuration de l'envoi d'emails pour les invitations clients

echo "📧 Configuration de l'envoi d'emails avec Resend"
echo ""
echo "Étape 1 : Créer un compte Resend (gratuit)"
echo "👉 https://resend.com/signup"
echo ""
echo "Étape 2 : Obtenir votre clé API"
echo "👉 https://resend.com/api-keys → Create API Key"
echo ""
echo "Étape 3 : Configurer le secret dans Supabase"
echo ""

# Demander la clé API
read -p "Entrez votre clé API Resend (format: re_xxxxx) : " RESEND_KEY

if [ -z "$RESEND_KEY" ]; then
  echo "❌ Clé API vide, annulation"
  exit 1
fi

echo ""
echo "🚀 Configuration du secret dans Supabase..."

# Configurer le secret
npx supabase secrets set RESEND_API_KEY="$RESEND_KEY"

echo ""
echo "✅ Secret configuré !"
echo ""
echo "🔄 Redéploiement de la fonction Edge..."

# Redéployer la fonction
npx supabase functions deploy send-client-invitation

echo ""
echo "✅ Configuration terminée !"
echo ""
echo "📧 Les invitations clients seront maintenant envoyées par email"
echo "   - De: Neira <noreply@neira.fr>"
echo "   - Contenu: Lien d'activation + code d'accès"
echo ""
