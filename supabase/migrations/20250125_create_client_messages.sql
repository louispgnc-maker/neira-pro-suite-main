-- Create client_messages table for client-professional communication
CREATE TABLE IF NOT EXISTS client_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'professional')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_client_messages_client_id ON client_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_sender_id ON client_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_created_at ON client_messages(created_at DESC);

-- Enable RLS
ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Clients can read messages in their conversation
CREATE POLICY "Clients can view their messages"
  ON client_messages FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Professionals can read messages from their clients
CREATE POLICY "Professionals can view client messages"
  ON client_messages FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE owner_id = auth.uid()
    )
  );

-- Clients can insert messages in their conversation
CREATE POLICY "Clients can send messages"
  ON client_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_type = 'client'
    AND client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Professionals can insert messages to their clients
CREATE POLICY "Professionals can send messages to clients"
  ON client_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_type = 'professional'
    AND client_id IN (
      SELECT id FROM clients WHERE owner_id = auth.uid()
    )
  );

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_client_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_messages_updated_at
  BEFORE UPDATE ON client_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_client_messages_updated_at();
