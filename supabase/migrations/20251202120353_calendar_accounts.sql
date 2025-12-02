-- Create calendar_accounts table for storing Google Calendar OAuth tokens
CREATE TABLE IF NOT EXISTS calendar_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Add google_event_id to calendar_events for bidirectional sync
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS google_event_id TEXT,
ADD COLUMN IF NOT EXISTS synced_to_google BOOLEAN DEFAULT FALSE;

-- Create index on google_event_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_event_id ON calendar_events(google_event_id);

-- Enable RLS
ALTER TABLE calendar_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for calendar_accounts
CREATE POLICY "Users can view their own calendar accounts"
  ON calendar_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar accounts"
  ON calendar_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar accounts"
  ON calendar_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar accounts"
  ON calendar_accounts FOR DELETE
  USING (auth.uid() = user_id);
