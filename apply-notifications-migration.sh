#!/bin/bash

# Script pour appliquer la migration des notifications client

echo "🔔 Application de la migration des notifications client..."

# Charger les variables d'environnement
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Vérifier que SUPABASE_DB_URL est défini
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ Erreur: SUPABASE_DB_URL n'est pas défini dans le fichier .env"
    exit 1
fi

# Appliquer la migration
psql "$SUPABASE_DB_URL" < supabase/migrations/20260126_create_client_notifications.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration des notifications appliquée avec succès!"
    echo ""
    echo "📝 Les fonctionnalités suivantes ont été ajoutées:"
    echo "  • Table client_notifications"
    echo "  • Notifications automatiques pour:"
    echo "    - Création de dossier"
    echo "    - Modification de dossier"
    echo "    - Ajout de document"
    echo "    - Partage de contrat"
    echo "    - Modification de profil"
    echo "    - Nouveaux messages"
    echo ""
    echo "🎯 Composant NotificationsCard ajouté au dashboard client"
else
    echo "❌ Erreur lors de l'application de la migration"
    exit 1
fi
