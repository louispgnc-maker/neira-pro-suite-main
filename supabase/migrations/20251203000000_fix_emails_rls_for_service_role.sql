-- Fix RLS policies on emails table to allow service_role (Edge Functions) to access
-- This is needed for Gmail sync functionality to work properly

-- Drop all existing policies on emails table
DROP POLICY IF EXISTS "Users can delete emails from their accounts" ON emails;
DROP POLICY IF EXISTS "Users can view emails from their accounts" ON emails;
DROP POLICY IF EXISTS "Users can update emails from their accounts" ON emails;
DROP POLICY IF EXISTS "emails_delete_policy" ON emails;
DROP POLICY IF EXISTS "emails_select_policy" ON emails;
DROP POLICY IF EXISTS "emails_update_policy" ON emails;
DROP POLICY IF EXISTS "emails_insert_policy" ON emails;

-- Create consistent policies that allow service_role OR user ownership
CREATE POLICY "emails_select_policy" ON emails
  FOR SELECT
  USING (
    auth.jwt()->>'role' = 'service_role'
    OR
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = emails.account_id
      AND email_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "emails_insert_policy" ON emails
  FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role'
    OR
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = emails.account_id
      AND email_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "emails_update_policy" ON emails
  FOR UPDATE
  USING (
    auth.jwt()->>'role' = 'service_role'
    OR
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = emails.account_id
      AND email_accounts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role'
    OR
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = emails.account_id
      AND email_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "emails_delete_policy" ON emails
  FOR DELETE
  USING (
    auth.jwt()->>'role' = 'service_role'
    OR
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = emails.account_id
      AND email_accounts.user_id = auth.uid()
    )
  );
