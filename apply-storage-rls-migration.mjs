// Script to apply storage RLS migration to Supabase
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey || supabaseServiceKey === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Applying storage RLS migration...');

    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260118_storage_shared_documents_rls.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing migration...');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: migrationSQL });
    
    if (error) {
      console.error('❌ Error:', error);
      throw error;
    }

    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('Les politiques RLS ont été mises à jour :');
    console.log('- Les professionnels peuvent supprimer tous les documents de leurs clients');
    console.log('- Les clients peuvent supprimer UNIQUEMENT les documents qu\'ils ont uploadés');
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

applyMigration();
