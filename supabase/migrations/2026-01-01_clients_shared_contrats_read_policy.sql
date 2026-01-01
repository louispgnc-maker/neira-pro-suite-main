-- Migration: Allow cabinet members to read clients from shared contracts
-- Date: 2026-01-01
-- Description: Add RLS policy to allow cabinet members to read client info from shared contracts

-- Add SELECT policy for cabinet members to read clients linked to shared contracts
DROP POLICY IF EXISTS "cabinet_members_read_clients_from_shared_contrats" ON public.clients;
CREATE POLICY "cabinet_members_read_clients_from_shared_contrats" ON public.clients
  FOR SELECT USING (
    id IN (
      SELECT c.client_id 
      FROM contrats c
      JOIN cabinet_contrats cc ON cc.contrat_id = c.id
      JOIN cabinet_members cm ON cm.cabinet_id = cc.cabinet_id
      WHERE cm.user_id = auth.uid() 
        AND cm.status = 'active'
        AND c.client_id IS NOT NULL
    )
  );

-- Note: This policy allows cabinet members to see client information
-- when a contract with an assigned client is shared via cabinet_contrats.
-- The client name and details will be visible to all cabinet members
-- viewing the shared contract.
--
-- Combined with existing client policies:
-- 1. Owner can read their own clients
-- 2. Cabinet members can read clients shared via cabinet_clients
-- 3. Cabinet members can read clients from shared contracts (NEW)
