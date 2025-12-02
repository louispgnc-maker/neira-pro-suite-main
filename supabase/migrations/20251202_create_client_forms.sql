-- Table pour stocker les formulaires clients
CREATE TABLE IF NOT EXISTS client_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  client_name TEXT,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  form_type TEXT NOT NULL DEFAULT 'client_intake' CHECK (form_type IN ('client_intake', 'notaire_intake', 'avocat_intake')),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour stocker les réponses des formulaires
CREATE TABLE IF NOT EXISTS client_form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES client_forms(id) ON DELETE CASCADE,
  response_data JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide par token
CREATE INDEX IF NOT EXISTS idx_client_forms_token ON client_forms(token);
CREATE INDEX IF NOT EXISTS idx_client_forms_cabinet ON client_forms(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_client_forms_status ON client_forms(status);
CREATE INDEX IF NOT EXISTS idx_client_form_responses_form ON client_form_responses(form_id);

-- RLS policies
ALTER TABLE client_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_form_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir les formulaires de leur cabinet
CREATE POLICY "Users can view forms in their cabinet" ON client_forms
  FOR SELECT
  USING (
    cabinet_id IN (
      SELECT cabinet_id FROM cabinet_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Les utilisateurs peuvent créer des formulaires dans leur cabinet
CREATE POLICY "Users can create forms in their cabinet" ON client_forms
  FOR INSERT
  WITH CHECK (
    cabinet_id IN (
      SELECT cabinet_id FROM cabinet_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Les utilisateurs peuvent modifier les formulaires de leur cabinet
CREATE POLICY "Users can update forms in their cabinet" ON client_forms
  FOR UPDATE
  USING (
    cabinet_id IN (
      SELECT cabinet_id FROM cabinet_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Les réponses sont lisibles par les membres du cabinet
CREATE POLICY "Cabinet members can view form responses" ON client_form_responses
  FOR SELECT
  USING (
    form_id IN (
      SELECT id FROM client_forms WHERE cabinet_id IN (
        SELECT cabinet_id FROM cabinet_members WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Permettre l'insertion anonyme des réponses (formulaire public)
CREATE POLICY "Anyone can submit form responses" ON client_form_responses
  FOR INSERT
  WITH CHECK (true);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_client_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_forms_updated_at
  BEFORE UPDATE ON client_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_client_forms_updated_at();
