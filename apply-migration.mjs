// Script to apply signature addons migration to Supabase
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Applying signature addons migration...');

    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20251225_add_signature_addons.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Migration SQL:');
    console.log(migrationSQL);
    console.log('');

    // Split SQL statements and execute one by one
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          console.error('❌ Error executing statement:', error);
          throw error;
        }
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. The signature addon columns are now available in the cabinets table');
    console.log('2. Users can now purchase signature packages');
    console.log('3. The system will automatically add purchased signatures to their limits');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('');
    console.log('Please apply the migration manually via Supabase SQL Editor:');
    console.log('1. Go to https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/sql');
    console.log('2. Copy the SQL from: supabase/migrations/20251225_add_signature_addons.sql');
    console.log('3. Paste and run');
    process.exit(1);
  }
}

applyMigration();
