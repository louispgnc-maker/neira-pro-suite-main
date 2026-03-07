#!/bin/bash

# Script pour ajouter les colonnes manquantes à la table signatures

echo "🔧 Application de la migration pour la table signatures..."

# Exécuter le SQL via supabase
supabase db execute "
ALTER TABLE signatures 
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS universign_url TEXT,
ADD COLUMN IF NOT EXISTS signatories JSONB,
ADD COLUMN IF NOT EXISTS item_type TEXT,
ADD COLUMN IF NOT EXISTS item_id UUID;

CREATE INDEX IF NOT EXISTS idx_signatures_transaction_id ON signatures(transaction_id);
CREATE INDEX IF NOT EXISTS idx_signatures_item_id ON signatures(item_id);
"

if [ $? -eq 0 ]; then
    echo "✅ Migration appliquée avec succès!"
else
    echo "❌ Erreur lors de l'application de la migration"
    echo "Essayez manuellement dans le SQL Editor de Supabase Dashboard"
fi
