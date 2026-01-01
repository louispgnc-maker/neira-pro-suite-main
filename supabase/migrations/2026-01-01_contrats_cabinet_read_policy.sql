-- Migration: Allow cabinet members to read shared contracts
-- Date: 2026-01-01
-- Description: Add RLS policy to allow cabinet members to read contracts shared via cabinet_contrats

-- Add SELECT policy for cabinet members to read shared contracts
DROP POLICY IF EXISTS "cabinet_members_read_shared_contrats" ON public.contrats;
CREATE POLICY "cabinet_members_read_shared_contrats" ON public.contrats
  FOR SELECT USING (
    id IN (
      SELECT cc.contrat_id 
      FROM cabinet_contrats cc
      JOIN cabinet_members cm ON cm.cabinet_id = cc.cabinet_id
      WHERE cm.user_id = auth.uid() 
        AND cm.status = 'active'
        AND cc.contrat_id IS NOT NULL
    )
  );

-- Note: This policy allows cabinet members to read the original contract
-- when a contract is shared via cabinet_contrats table.
-- Combined with existing policies:
-- 1. contrats_select_own: Users can read their own contracts
-- 2. Users can view contrats linked to shared dossiers: For dossier-linked contracts
-- 3. cabinet_members_read_shared_contrats: For directly shared contracts (NEW)
