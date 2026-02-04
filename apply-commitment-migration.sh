#!/bin/bash

# Script pour appliquer la migration d'engagement directement à Supabase

echo "🔧 Application de la migration d'engagement..."

# Lire le fichier SQL
SQL_FILE="supabase/migrations/20260204_add_subscription_commitment.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Fichier de migration introuvable: $SQL_FILE"
    exit 1
fi

SQL_CONTENT=$(cat "$SQL_FILE")

# Appliquer via l'API Supabase
npx supabase db execute "$SQL_CONTENT"

echo "✅ Migration appliquée avec succès"
