-- Migration: Fix infinite recursion in clients RLS policies
-- Description: Remove policies that reference non-existent tables or cause recursion

-- Policies removed:
-- 1. cabinet_members_read_clients_from_shared_contrats - references non-existent cabinet_clients table
-- 2. cabinet_members_select_shared_clients - references non-existent cabinet_clients table  
-- 3. cabinet_owners_can_count_member_clients - causes recursion with clients.role reference

-- Remaining functional policies:
-- - Clients can view their own data (user_id = auth.uid())
-- - Clients can update their own data (user_id = auth.uid())
-- - Professionals can view their cabinet clients (via cabinet_members)
-- - Professionals can update their cabinet clients (via cabinet_members)
-- - clients_delete_own (owner_id = auth.uid())
-- - clients_insert_own (owner_id = auth.uid())
-- - clients_update_own (owner_id = auth.uid())
