-- Migration: Création de la table pour stocker les états du pipeline de création de contrats

-- Supprimer la table si elle existe déjà (pour permettre de relancer proprement)
DROP TABLE IF EXISTS contract_pipeline_states CASCADE;

CREATE TABLE contract_pipeline_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL,
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_pipeline_states_user_id ON contract_pipeline_states(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_states_created_at ON contract_pipeline_states(created_at DESC);

-- RLS (Row Level Security) pour sécuriser l'accès
ALTER TABLE contract_pipeline_states ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir/modifier uniquement leurs propres états
CREATE POLICY "Users can view their own pipeline states"
  ON contract_pipeline_states
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pipeline states"
  ON contract_pipeline_states
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pipeline states"
  ON contract_pipeline_states
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pipeline states"
  ON contract_pipeline_states
  FOR DELETE
  USING (auth.uid() = user_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_pipeline_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER set_pipeline_state_updated_at
  BEFORE UPDATE ON contract_pipeline_states
  FOR EACH ROW
  EXECUTE FUNCTION update_pipeline_state_timestamp();

-- Commentaires pour documentation
COMMENT ON TABLE contract_pipeline_states IS 'Stocke les états des pipelines de création de contrats pour permettre la reprise de sessions';
COMMENT ON COLUMN contract_pipeline_states.state IS 'État complet du pipeline au format JSON (ContractPipelineState)';
