-- Migration: Fix client-cabinet relations and add proper constraints
-- Description: Ajoute les clés étrangères manquantes et les RLS policies pour l'espace client

-- 1. Ajouter la clé étrangère entre clients.owner_id et cabinets.id si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'clients_owner_id_fkey' 
    AND table_name = 'clients'
  ) THEN
    ALTER TABLE clients
    ADD CONSTRAINT clients_owner_id_fkey 
    FOREIGN KEY (owner_id) REFERENCES cabinets(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Ajouter la clé étrangère entre clients.user_id et auth.users.id si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'clients_user_id_fkey' 
    AND table_name = 'clients'
  ) THEN
    ALTER TABLE clients
    ADD CONSTRAINT clients_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Créer un index sur owner_id pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- 4. Ajouter les RLS policies pour que les clients puissent voir leurs propres données
DROP POLICY IF EXISTS "Clients can view their own data" ON clients;
CREATE POLICY "Clients can view their own data"
  ON clients
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 5. Permettre aux clients de mettre à jour leurs propres données (pour les suggestions)
DROP POLICY IF EXISTS "Clients can update their own data" ON clients;
CREATE POLICY "Clients can update their own data"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 6. Les professionnels peuvent voir les clients de leur cabinet
DROP POLICY IF EXISTS "Professionals can view their cabinet clients" ON clients;
CREATE POLICY "Professionals can view their cabinet clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    owner_id IN (
      SELECT cabinet_id FROM cabinet_members WHERE user_id = auth.uid()
    )
  );

-- 7. Les professionnels peuvent mettre à jour les clients de leur cabinet
DROP POLICY IF EXISTS "Professionals can update their cabinet clients" ON clients;
CREATE POLICY "Professionals can update their cabinet clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (
    owner_id IN (
      SELECT cabinet_id FROM cabinet_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    owner_id IN (
      SELECT cabinet_id FROM cabinet_members WHERE user_id = auth.uid()
    )
  );

-- 8. RLS policies pour les dossiers - les clients peuvent voir leurs dossiers
DROP POLICY IF EXISTS "Clients can view their own dossiers" ON dossiers;
CREATE POLICY "Clients can view their own dossiers"
  ON dossiers
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- 9. RLS pour le storage - les clients peuvent accéder à leurs documents
DROP POLICY IF EXISTS "Clients can view their documents" ON storage.objects;
CREATE POLICY "Clients can view their documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM clients WHERE user_id = auth.uid()
    )
  );

-- 10. Les clients peuvent uploader leurs documents
DROP POLICY IF EXISTS "Clients can upload their documents" ON storage.objects;
CREATE POLICY "Clients can upload their documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM clients WHERE user_id = auth.uid()
    )
  );

-- 11. Les clients peuvent supprimer leurs documents
DROP POLICY IF EXISTS "Clients can delete their documents" ON storage.objects;
CREATE POLICY "Clients can delete their documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM clients WHERE user_id = auth.uid()
    )
  );

COMMENT ON CONSTRAINT clients_owner_id_fkey ON clients IS 'Lien entre le client et le cabinet qui le possède';
COMMENT ON CONSTRAINT clients_user_id_fkey ON clients IS 'Lien entre le client et son compte utilisateur Supabase Auth';
