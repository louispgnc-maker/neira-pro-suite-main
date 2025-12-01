-- Drop and recreate emails table with correct structure
DROP TABLE IF EXISTS public.emails CASCADE;

CREATE TABLE public.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  message_id VARCHAR(255) NOT NULL,
  thread_id VARCHAR(255),
  subject TEXT,
  from_address TEXT,
  to_address TEXT,
  cc_address TEXT,
  body_text TEXT,
  body_html TEXT,
  received_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  labels TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, message_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_emails_account_id ON emails(account_id);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read);

-- Enable RLS
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emails
DROP POLICY IF EXISTS "Users can view emails from their accounts" ON emails;
CREATE POLICY "Users can view emails from their accounts"
  ON emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = emails.account_id
      AND email_accounts.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert emails for their accounts" ON emails;
CREATE POLICY "Users can insert emails for their accounts"
  ON emails FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = emails.account_id
      AND email_accounts.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update emails from their accounts" ON emails;
CREATE POLICY "Users can update emails from their accounts"
  ON emails FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = emails.account_id
      AND email_accounts.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete emails from their accounts" ON emails;
CREATE POLICY "Users can delete emails from their accounts"
  ON emails FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = emails.account_id
      AND email_accounts.user_id = auth.uid()
    )
  );
