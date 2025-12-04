-- Allow public form submissions to create clients
-- This is needed for the client intake form to work

-- Drop existing policy
DROP POLICY IF EXISTS "clients_insert_own" ON clients;

-- Create new policy that allows insertion from forms
CREATE POLICY "clients_insert_own_or_from_form" ON clients
FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  OR
  -- Allow insert if coming from a valid client form
  cabinet_id IN (
    SELECT cabinet_id 
    FROM client_forms 
    WHERE status = 'pending'
  )
);

-- Update client_form_responses to link to client
ALTER TABLE client_form_responses 
ADD COLUMN IF NOT EXISTS created_client_id uuid REFERENCES clients(id);

COMMENT ON COLUMN client_form_responses.created_client_id IS 'The client created from this form response';
