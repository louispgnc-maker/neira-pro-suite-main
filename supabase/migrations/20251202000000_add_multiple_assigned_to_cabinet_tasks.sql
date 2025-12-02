-- Modifier la colonne assigned_to pour accepter plusieurs membres
-- Si la table existe déjà avec une colonne assigned_to text, on la convertit en tableau

-- Supprimer l'ancienne colonne si elle existe
ALTER TABLE cabinet_tasks DROP COLUMN IF EXISTS assigned_to;

-- Ajouter la nouvelle colonne en tant que tableau de text
ALTER TABLE cabinet_tasks ADD COLUMN assigned_to text[] DEFAULT '{}';

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_cabinet_tasks_assigned_to ON cabinet_tasks USING gin(assigned_to);

-- Commentaire
COMMENT ON COLUMN cabinet_tasks.assigned_to IS 'Array of user IDs assigned to this task';
