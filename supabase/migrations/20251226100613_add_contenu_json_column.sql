-- Ajouter la colonne contenu_json à la table contrats
-- Cette colonne stocke les données du formulaire de création du contrat
-- au format JSON pour permettre la régénération avec l'IA

ALTER TABLE contrats 
ADD COLUMN IF NOT EXISTS contenu_json jsonb;

COMMENT ON COLUMN contrats.contenu_json IS 'Données du formulaire de création du contrat au format JSON (utilisé pour régénération IA)';

CREATE INDEX IF NOT EXISTS idx_contrats_contenu_json ON contrats USING gin (contenu_json);
