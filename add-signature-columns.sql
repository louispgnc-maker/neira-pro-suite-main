-- Ajouter les colonnes manquantes à la table signatures

ALTER TABLE signatures 
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS universign_url TEXT,
ADD COLUMN IF NOT EXISTS signatories JSONB,
ADD COLUMN IF NOT EXISTS item_type TEXT,
ADD COLUMN IF NOT EXISTS item_id UUID;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_signatures_transaction_id ON signatures(transaction_id);
CREATE INDEX IF NOT EXISTS idx_signatures_item_id ON signatures(item_id);
