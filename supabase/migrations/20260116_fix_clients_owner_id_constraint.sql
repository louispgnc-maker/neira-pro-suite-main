-- Migration: Fix clients.owner_id foreign key constraint
-- Description: owner_id should reference cabinets.id, not auth.users.id

-- Drop the incorrect constraint
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_owner_id_fkey;

-- Add the correct constraint pointing to cabinets
ALTER TABLE clients 
ADD CONSTRAINT clients_owner_id_fkey 
FOREIGN KEY (owner_id) 
REFERENCES cabinets(id) 
ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON clients(owner_id);

COMMENT ON CONSTRAINT clients_owner_id_fkey ON clients IS 'Le owner_id doit référencer le cabinet auquel appartient le client';
