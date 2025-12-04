#!/bin/bash
# Script de test pour l'envoi d'email via Resend

echo "🧪 Test d'envoi d'email via Resend..."
echo ""

# Obtenez votre session token
echo "📋 Récupération du token de session..."

# Appelez la fonction Edge
curl -X POST \
  'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/send-client-form' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "clientEmail": "louispgnc@gmail.com",
    "clientName": "Test Louis",
    "cabinetId": "243ed8b0-3d58-47eb-b518-791fac0ba71f",
    "userId": "fbe826f4-45ec-44e3-879a-5268745e1ee8"
  }'

echo ""
echo ""
echo "✅ Test terminé !"
echo "Vérifiez :"
echo "1. Les logs Supabase : supabase functions logs send-client-form"
echo "2. Votre boîte email : louispgnc@gmail.com"
echo "3. Le dashboard Resend : https://resend.com/emails"
