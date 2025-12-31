-- Migration: Add UPDATE policy for cabinet_contrats
-- Date: 2025-12-31
-- Description: Allows only the creator (shared_by) to update shared contracts
-- Other members can read but not modify

-- Remove any existing permissive UPDATE policy
drop policy if exists "cabinet_members_update_contrats" on public.cabinet_contrats;

-- Remove obsolete DELETE policy (replaced by cabinet_owner_or_sharer_delete_contrats)
drop policy if exists "cabinet_members_delete_contrats" on public.cabinet_contrats;

-- Add UPDATE policy for cabinet_contrats
-- Only the person who shared the contract can update it
drop policy if exists "cabinet_sharer_update_contrats" on public.cabinet_contrats;
create policy "cabinet_sharer_update_contrats" on public.cabinet_contrats
  for update using (
    shared_by = auth.uid()
  )
  with check (
    shared_by = auth.uid()
  );

-- Note: Final policies for cabinet_contrats:
-- 1. SELECT: All cabinet members can READ shared contracts (via "cabinet_members_read_contrats")
-- 2. INSERT: All cabinet members can SHARE new contracts (via "cabinet_members_insert_contrats")
-- 3. UPDATE: Only the creator can MODIFY the contract (via "cabinet_sharer_update_contrats")
-- 4. DELETE: Only the creator OR owner can DELETE (via "cabinet_owner_or_sharer_delete_contrats")
