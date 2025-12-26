-- Ajouter la colonne contenu_json à la table contrats
-- Cette colonne stockera les données du formulaire au format JSON

ALTER TABLE contrats 
ADD COLUMN IF NOT EXISTS contenu_json jsonb;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN contrats.contenu_json IS 'Données du formulaire de création du contrat au format JSON (pour régénération IA)';

-- Créer un index GIN pour permettre des requêtes efficaces sur le JSON
CREATE INDEX IF NOT EXISTS idx_contrats_contenu_json ON contrats USING gin (contenu_json);
