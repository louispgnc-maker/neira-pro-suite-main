-- Migration: RLS policies pour client_shared_documents
-- Description: Permet aux clients ET aux professionnels de déposer des documents

-- Activer RLS si pas déjà fait
ALTER TABLE client_shared_documents ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Clients can view their own documents" ON client_shared_documents;
DROP POLICY IF EXISTS "Professionals can view client documents" ON client_shared_documents;
DROP POLICY IF EXISTS "Professionals can insert client documents" ON client_shared_documents;
DROP POLICY IF EXISTS "Clients can insert their own documents" ON client_shared_documents;
DROP POLICY IF EXISTS "Professionals can delete client documents" ON client_shared_documents;

-- SELECT: Les clients voient leurs docs, les pros voient les docs de leurs clients
CREATE POLICY "Clients and professionals can view documents"
  ON client_shared_documents
  FOR SELECT
  TO authenticated
  USING (
    -- Le client peut voir ses propres documents
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
    OR
    -- Le professionnel peut voir les documents de ses clients
    client_id IN (
      SELECT c.id 
      FROM clients c
      INNER JOIN cabinet_members cm ON cm.cabinet_id = c.owner_id
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );

-- INSERT: Les clients peuvent uploader leurs docs, les pros peuvent uploader pour leurs clients
CREATE POLICY "Clients and professionals can insert documents"
  ON client_shared_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Le client peut uploader ses propres documents
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
    OR
    -- Le professionnel peut uploader pour ses clients
    client_id IN (
      SELECT c.id 
      FROM clients c
      INNER JOIN cabinet_members cm ON cm.cabinet_id = c.owner_id
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );

-- DELETE: Les clients peuvent supprimer leurs docs, les pros peuvent supprimer les docs de leurs clients
CREATE POLICY "Clients and professionals can delete documents"
  ON client_shared_documents
  FOR DELETE
  TO authenticated
  USING (
    -- Le client peut supprimer ses propres documents
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
    OR
    -- Le professionnel peut supprimer les documents de ses clients
    client_id IN (
      SELECT c.id 
      FROM clients c
      INNER JOIN cabinet_members cm ON cm.cabinet_id = c.owner_id
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );

-- UPDATE: Similaire pour la modification
CREATE POLICY "Clients and professionals can update documents"
  ON client_shared_documents
  FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
    OR
    client_id IN (
      SELECT c.id 
      FROM clients c
      INNER JOIN cabinet_members cm ON cm.cabinet_id = c.owner_id
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
    OR
    client_id IN (
      SELECT c.id 
      FROM clients c
      INNER JOIN cabinet_members cm ON cm.cabinet_id = c.owner_id
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );
