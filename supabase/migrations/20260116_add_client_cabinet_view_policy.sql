-- Migration: Add RLS policy for clients to view their cabinet info
-- Description: Permet aux clients de voir les informations de leur cabinet (nom uniquement)

-- Permettre aux clients de voir le nom du cabinet auquel ils appartiennent
DROP POLICY IF EXISTS "Clients can view their own cabinet" ON cabinets;
CREATE POLICY "Clients can view their own cabinet"
  ON cabinets
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT owner_id FROM clients WHERE user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Clients can view their own cabinet" ON cabinets IS 'Permet aux clients de voir le nom de leur cabinet pour l''afficher dans l''interface';
