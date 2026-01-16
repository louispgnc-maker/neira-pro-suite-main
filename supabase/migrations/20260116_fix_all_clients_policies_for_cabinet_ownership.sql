-- Migration: Fix all clients RLS policies to work with cabinet ownership
-- Description: Update all policies to check cabinet_members instead of owner_id = auth.uid()

-- Note: Since owner_id now references cabinets.id instead of users.id,
-- all policies must check if the user is an active member of the cabinet
-- via the cabinet_members table.
