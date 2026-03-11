import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDczOTQ0MCwiZXhwIjoyMDQ2MzE1NDQwfQ.Ry3yK8sM8EYQ2S-M3wTcl7AJXzZo7w8c53lH1YPLqOs';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function addTestAccountMarker() {
  console.log('Adding is_test_account column to profiles...');
  
  // Check if column exists
  const { data: columns, error: checkError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name = 'is_test_account';
    `
  });

  if (checkError) {
    // Try direct SQL instead
    const { error: alterError } = await supabase.rpc('exec_sql', {
      query: `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name = 'is_test_account'
          ) THEN
            ALTER TABLE profiles ADD COLUMN is_test_account BOOLEAN DEFAULT false;
            CREATE INDEX idx_profiles_test_account ON profiles(is_test_account) WHERE is_test_account = true;
          END IF;
        END $$;
      `
    });

    if (alterError) {
      console.error('Error adding column:', alterError);
      // Try using admin api
      console.log('Trying via direct SQL execution...');
      const { error: execError } = await supabase.from('profiles').select('is_test_account').limit(1);
      
      if (execError?.message?.includes('column "is_test_account" does not exist')) {
        console.log('Column does not exist, using SQL editor approach');
        console.log('\nPlease run this SQL in Supabase SQL Editor:\n');
        console.log('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN DEFAULT false;');
        console.log('CREATE INDEX IF NOT EXISTS idx_profiles_test_account ON profiles(is_test_account) WHERE is_test_account = true;');
        console.log('UPDATE profiles SET is_test_account = true WHERE email = \'denis@neira.test\';\n');
        return;
      }
    }
  }

  // Mark denis@neira.test as test account
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ is_test_account: true })
    .eq('email', 'denis@neira.test');

  if (updateError) {
    console.error('Error marking account as test:', updateError);
  } else {
    console.log('✓ Successfully added is_test_account marker');
    console.log('✓ denis@neira.test marked as test account');
  }
}

addTestAccountMarker().catch(console.error);
