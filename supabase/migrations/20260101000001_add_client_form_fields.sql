-- Migration: Ajout des nouveaux champs pour le formulaire de création client

-- Ajout pays de délivrance de la pièce d'identité
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS pays_delivrance_identite TEXT DEFAULT 'France';

-- Ajout numéro WhatsApp
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Ajout plage horaire préférée
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS plage_horaire TEXT;

-- Commentaires pour documentation
COMMENT ON COLUMN clients.pays_delivrance_identite IS 'Pays de délivrance de la pièce d''identité (pour KYC)';
COMMENT ON COLUMN clients.whatsapp IS 'Numéro WhatsApp du client (communication)';
COMMENT ON COLUMN clients.plage_horaire IS 'Plage horaire préférée pour contact (matin/après-midi/soir/flexible)';
