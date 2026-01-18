-- Migration pour les tables dossiers et documents de dossiers
-- Créée le 2025-01-17

-- Créer la fonction de trigger si elle n'existe pas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Table dossiers (utilise client_dossiers_new pour éviter conflit avec table existante)
CREATE TABLE IF NOT EXISTS client_dossiers_new (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  cabinet_id UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'en_cours' CHECK (status IN ('en_cours', 'en_attente', 'termine')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_client_dossiers_new_client_id ON client_dossiers_new(client_id);
CREATE INDEX IF NOT EXISTS idx_client_dossiers_new_cabinet_id ON client_dossiers_new(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_client_dossiers_new_status ON client_dossiers_new(status);

-- Table pour lier les documents aux dossiers
CREATE TABLE IF NOT EXISTS client_dossier_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID NOT NULL REFERENCES client_dossiers_new(id) ON DELETE CASCADE,
  document_id UUID NOT NULL,
  document_nom TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_taille INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('personal', 'client_shared', 'cabinet_shared')),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(dossier_id, document_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_client_dossier_documents_dossier_id ON client_dossier_documents(dossier_id);
CREATE INDEX IF NOT EXISTS idx_client_dossier_documents_document_id ON client_dossier_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_client_dossier_documents_source ON client_dossier_documents(source);

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS update_client_dossiers_new_updated_at ON client_dossiers_new;
CREATE TRIGGER update_client_dossiers_new_updated_at
  BEFORE UPDATE ON client_dossiers_new
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) Policies
ALTER TABLE client_dossiers_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_dossier_documents ENABLE ROW LEVEL SECURITY;

-- Politique pour dossiers: les professionnels peuvent tout faire sur leurs dossiers
DROP POLICY IF EXISTS "Professionnels peuvent gérer leurs dossiers" ON client_dossiers_new;
CREATE POLICY "Professionnels peuvent gérer leurs dossiers"
ON client_dossiers_new
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid()
    AND profiles.cabinet_id = client_dossiers_new.cabinet_id
  )
);

-- Politique pour dossiers: les clients peuvent voir leurs dossiers
DROP POLICY IF EXISTS "Clients peuvent voir leurs dossiers" ON client_dossiers_new;
CREATE POLICY "Clients peuvent voir leurs dossiers"
ON client_dossiers_new
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM clients 
    WHERE clients.user_id = auth.uid()
    AND clients.id = client_dossiers_new.client_id
  )
);

-- Politique pour dossier_documents: accès basé sur l'accès au dossier parent
DROP POLICY IF EXISTS "Accès documents dossier" ON client_dossier_documents;
CREATE POLICY "Accès documents dossier"
ON client_dossier_documents
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM client_dossiers_new 
    WHERE client_dossiers_new.id = client_dossier_documents.dossier_id
    AND (
      EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE profiles.id = auth.uid()
        AND profiles.cabinet_id = client_dossiers_new.cabinet_id
      )
      OR EXISTS (
        SELECT 1 
        FROM clients 
        WHERE clients.user_id = auth.uid()
        AND clients.id = client_dossiers_new.client_id
      )
    )
  )
);

-- Commentaires pour documentation
COMMENT ON TABLE client_dossiers_new IS 'Dossiers pour organiser les documents et informations des clients';
COMMENT ON TABLE client_dossier_documents IS 'Documents associés aux dossiers, avec référence à leur source';
COMMENT ON COLUMN client_dossier_documents.source IS 'Source du document: personal (espace perso), client_shared (espace client), cabinet_shared (espace cabinet)';
