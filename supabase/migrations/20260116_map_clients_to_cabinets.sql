-- Migration: Map clients.owner_id from user_id to cabinet_id
-- Description: Currently owner_id contains user IDs, but it should reference cabinet IDs

-- Step 1: Add a temporary column to store cabinet_id
ALTER TABLE clients ADD COLUMN IF NOT EXISTS temp_cabinet_id UUID;

-- Step 2: Map each client to their cabinet using the cabinet's owner_id
-- For each client, find the cabinet where cabinet.owner_id = client.owner_id
UPDATE clients c
SET temp_cabinet_id = cab.id
FROM cabinets cab
WHERE cab.owner_id = c.owner_id;

-- Step 3: For clients without a matching cabinet, we need to handle them
-- Check if there are any orphaned clients first
DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM clients
  WHERE temp_cabinet_id IS NULL;
  
  IF orphan_count > 0 THEN
    RAISE NOTICE 'Warning: % clients have no matching cabinet and will need manual intervention', orphan_count;
  END IF;
END$$;

-- Step 4: Drop the old foreign key constraint (if exists)
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_owner_id_fkey;

-- Step 5: Copy temp_cabinet_id to owner_id for clients that have a cabinet
UPDATE clients
SET owner_id = temp_cabinet_id
WHERE temp_cabinet_id IS NOT NULL;

-- Step 6: Drop the temporary column
ALTER TABLE clients DROP COLUMN temp_cabinet_id;

-- Step 7: Add the correct foreign key constraint
ALTER TABLE clients 
ADD CONSTRAINT clients_owner_id_fkey 
FOREIGN KEY (owner_id) 
REFERENCES cabinets(id) 
ON DELETE CASCADE;

-- Step 8: Add index for performance
CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON clients(owner_id);

COMMENT ON CONSTRAINT clients_owner_id_fkey ON clients IS 'Le owner_id doit référencer le cabinet auquel appartient le client';
