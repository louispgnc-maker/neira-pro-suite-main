-- Create RPC function to insert synced emails
-- This function has SECURITY DEFINER which bypasses RLS policies
-- Needed for gmail-sync Edge Function to insert emails

CREATE OR REPLACE FUNCTION insert_synced_email(
  p_account_id UUID,
  p_message_id TEXT,
  p_thread_id TEXT,
  p_subject TEXT,
  p_from_address TEXT,
  p_to_address TEXT,
  p_cc_address TEXT,
  p_body_text TEXT,
  p_body_html TEXT,
  p_received_at TIMESTAMPTZ,
  p_is_read BOOLEAN,
  p_is_starred BOOLEAN,
  p_labels TEXT[],
  p_has_attachments BOOLEAN,
  p_attachments JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email_id UUID;
BEGIN
  INSERT INTO emails (
    account_id,
    message_id,
    thread_id,
    subject,
    from_address,
    to_address,
    cc_address,
    body_text,
    body_html,
    received_at,
    is_read,
    is_starred,
    labels,
    has_attachments,
    attachments
  ) VALUES (
    p_account_id,
    p_message_id,
    p_thread_id,
    p_subject,
    p_from_address,
    p_to_address,
    p_cc_address,
    p_body_text,
    p_body_html,
    p_received_at,
    p_is_read,
    p_is_starred,
    p_labels,
    p_has_attachments,
    p_attachments
  )
  RETURNING id INTO v_email_id;
  
  RETURN v_email_id;
END;
$$;
