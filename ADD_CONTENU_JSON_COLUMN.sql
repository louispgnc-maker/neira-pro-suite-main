-- =============================================================================
-- MIGRATION: Ajouter la colonne contenu_json à la table contrats
-- =============================================================================
-- Cette migration ajoute une colonne JSONB pour stocker les données du 
-- formulaire de création du contrat. Cela permet de régénérer le contrat
-- avec l'IA en utilisant les données originales.
--
-- INSTRUCTIONS:
-- 1. Allez sur https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/sql/new
-- 2. Copiez-collez ce SQL dans l'éditeur
-- 3. Cliquez sur "Run" (ou Cmd+Enter)
-- =============================================================================

-- Ajouter la colonne contenu_json (type JSONB pour performances optimales)
ALTER TABLE contrats 
ADD COLUMN IF NOT EXISTS contenu_json jsonb;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN contrats.contenu_json IS 'Données du formulaire de création du contrat au format JSON (utilisé pour régénération IA)';

-- Créer un index GIN pour des requêtes JSON efficaces (optionnel mais recommandé)
CREATE INDEX IF NOT EXISTS idx_contrats_contenu_json ON contrats USING gin (contenu_json);

-- Vérification: afficher les colonnes de la table contrats
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contrats'
ORDER BY ordinal_position;
