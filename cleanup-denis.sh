#!/bin/bash

echo "🧹 Nettoyage complet du compte denis@neira.test"
echo ""
echo "⚠️  ATTENTION : Cette action va supprimer :"
echo "   - Tous les clients créés"
echo "   - Tous les dossiers"
echo "   - Tous les contrats"
echo "   - Toutes les signatures"
echo "   - Le cabinet et ses membres"
echo "   - Le profil et le compte utilisateur"
echo ""
read -p "Voulez-vous continuer ? (oui/non) " -n 3 -r
echo
if [[ ! $REPLY =~ ^[Oo][Uu][Ii]$ ]]
then
    echo "❌ Annulé"
    exit 1
fi

echo ""
echo "🚀 Exécution du nettoyage..."
node cleanup-denis.js

echo ""
echo "✅ Terminé !"
echo ""
echo "💡 Pour recréer le compte :"
echo "   node configure-denis.js"
