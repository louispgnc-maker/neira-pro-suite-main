-- Ajouter le champ signed_count à la table signatures
-- Ce champ stocke le nombre de signataires qui ont effectivement signé
-- Utilisé quand la transaction est annulée/fermée pour compter uniquement les signatures complètes

ALTER TABLE signatures 
ADD COLUMN IF NOT EXISTS signed_count INTEGER DEFAULT 0;

-- Mettre à jour les signatures existantes avec status='cancelled' ou 'closed'
-- Pour l'instant, on met 0 car on ne sait pas combien ont signé
UPDATE signatures 
SET signed_count = 0 
WHERE (status = 'cancelled' OR status = 'closed') 
  AND signed_count IS NULL;

-- Ajouter une colonne pour la date de fermeture
ALTER TABLE signatures
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

COMMENT ON COLUMN signatures.signed_count IS 'Nombre de signataires qui ont effectivement signé (utilisé pour transactions annulées/fermées)';
COMMENT ON COLUMN signatures.closed_at IS 'Date de fermeture manuelle de la transaction';
