-- Migration: Create client_profile_suggestions table
-- Description: Permet aux clients de suggérer des modifications à leur profil que les professionnels peuvent accepter ou refuser

CREATE TABLE IF NOT EXISTS client_profile_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  cabinet_id UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  suggested_changes JSONB NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_client_profile_suggestions_client ON client_profile_suggestions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_profile_suggestions_cabinet ON client_profile_suggestions(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_client_profile_suggestions_status ON client_profile_suggestions(status);

-- RLS Policies
ALTER TABLE client_profile_suggestions ENABLE ROW LEVEL SECURITY;

-- Les clients peuvent créer et voir leurs propres suggestions
CREATE POLICY "Clients can create their own suggestions"
  ON client_profile_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view their own suggestions"
  ON client_profile_suggestions
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Les professionnels peuvent voir et mettre à jour les suggestions de leurs clients
CREATE POLICY "Professionals can view client suggestions"
  ON client_profile_suggestions
  FOR SELECT
  TO authenticated
  USING (
    cabinet_id IN (
      SELECT cabinet_id FROM cabinet_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can update client suggestions"
  ON client_profile_suggestions
  FOR UPDATE
  TO authenticated
  USING (
    cabinet_id IN (
      SELECT cabinet_id FROM cabinet_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    cabinet_id IN (
      SELECT cabinet_id FROM cabinet_members WHERE user_id = auth.uid()
    )
  );

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_client_profile_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_profile_suggestions_updated_at
  BEFORE UPDATE ON client_profile_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_client_profile_suggestions_updated_at();

COMMENT ON TABLE client_profile_suggestions IS 'Suggestions de modifications de profil envoyées par les clients aux professionnels';
COMMENT ON COLUMN client_profile_suggestions.suggested_changes IS 'Array JSON des champs modifiés avec leurs anciennes et nouvelles valeurs';
COMMENT ON COLUMN client_profile_suggestions.reason IS 'Raison fournie par le client pour les modifications';
COMMENT ON COLUMN client_profile_suggestions.status IS 'Statut: pending (en attente), approved (approuvé), rejected (refusé)';
