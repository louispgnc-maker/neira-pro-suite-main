-- Add missing columns to email_accounts table if they don't exist
DO $$ 
BEGIN
  -- Add access_token column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_accounts' 
    AND column_name = 'access_token'
  ) THEN
    ALTER TABLE email_accounts ADD COLUMN access_token TEXT;
  END IF;

  -- Add refresh_token column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_accounts' 
    AND column_name = 'refresh_token'
  ) THEN
    ALTER TABLE email_accounts ADD COLUMN refresh_token TEXT;
  END IF;

  -- Add token_expires_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_accounts' 
    AND column_name = 'token_expires_at'
  ) THEN
    ALTER TABLE email_accounts ADD COLUMN token_expires_at TIMESTAMPTZ;
  END IF;

  -- Make access_token NOT NULL if it exists and is nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_accounts' 
    AND column_name = 'access_token'
    AND is_nullable = 'YES'
  ) THEN
    -- First set default value for existing NULL rows
    UPDATE email_accounts SET access_token = '' WHERE access_token IS NULL;
    -- Then make it NOT NULL
    ALTER TABLE email_accounts ALTER COLUMN access_token SET NOT NULL;
  END IF;
END $$;
