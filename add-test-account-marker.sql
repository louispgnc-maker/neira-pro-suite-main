-- Add is_test_account marker to profiles table
-- This allows test accounts to auto-upgrade to Cabinet-Plus after cabinet creation

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_test_account ON profiles(is_test_account) WHERE is_test_account = true;

-- Mark denis@neira.test as test account if exists
UPDATE profiles 
SET is_test_account = true 
WHERE email = 'denis@neira.test';
