import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTAwMDA2MCwiZXhwIjoyMDQ2NTc2MDYwfQ.YQYm6vhV1_AzCcWqW8LLmPUiXl1NTEooEt_GMGKu28E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('📂 Reading migration file...');
    const migrationPath = join(__dirname, '../supabase/migrations/20260118_client_shared_documents_rls.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log('🚀 Executing SQL via REST API...\n');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      // Essayer l'approche directe via l'API PostgREST
      console.log('⚠️  Trying direct SQL execution...');
      
      const directResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sql',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=minimal'
        },
        body: sql
      });
      
      if (!directResponse.ok) {
        const error = await directResponse.text();
        throw new Error(`HTTP ${directResponse.status}: ${error}`);
      }
    }
    
    console.log('✅ Migration applied successfully!');
    console.log('📄 RLS policies configured for client_shared_documents');
    console.log('👥 Clients and professionals can now upload documents');
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.log('\n📝 Manual application required:');
    console.log('1. Go to: https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/sql');
    console.log('2. Copy content from: supabase/migrations/20260118_client_shared_documents_rls.sql');
    console.log('3. Paste and click "Run"');
    process.exit(1);
  }
}

applyMigration();
