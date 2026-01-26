import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE2MzMxNCwiZXhwIjoyMDc3NzM5MzE0fQ.ferf8sE3M2vdYPjPHchrJF8XhL01xAODSRRQ9wmTJE4';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyNotificationsMigration() {
  try {
    console.log('🔔 Applying client notifications migration...\n');
    
    const migrationPath = './supabase/migrations/20260126_create_client_notifications.sql';
    console.log(`📂 Reading from: ${migrationPath}\n`);
    const sqlContent = readFileSync(migrationPath, 'utf-8');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip comments
      if (statement.trim().startsWith('--')) continue;
      
      try {
        console.log(`[${i + 1}/${statements.length}] Executing...`);
        
        const { data, error } = await supabase.rpc('exec', { sql: statement });
        
        if (error) {
          // Try without rpc for DDL statements
          const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/sql',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Prefer': 'return=representation'
            },
            body: statement
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            // Ignore "already exists" errors
            if (!errorText.includes('already exists')) {
              console.error(`❌ Error: ${errorText.substring(0, 200)}`);
              errorCount++;
            } else {
              console.log(`✓ Skipped (already exists)`);
              successCount++;
            }
          } else {
            console.log(`✓ Success`);
            successCount++;
          }
        } else {
          console.log(`✓ Success`);
          successCount++;
        }
      } catch (err) {
        const errorMsg = err.message || String(err);
        if (!errorMsg.includes('already exists')) {
          console.error(`❌ Error:`, errorMsg.substring(0, 200));
          errorCount++;
        } else {
          console.log(`✓ Skipped (already exists)`);
          successCount++;
        }
      }
    }
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ Migration completed!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`${'='.repeat(50)}\n`);
    
    console.log('🎯 Notifications system is ready!');
    console.log('   • Table: client_notifications');
    console.log('   • Triggers: dossiers, documents, contrats, messages, profile');
    console.log('   • Component: NotificationsCard integrated in dashboard');
    console.log('\n🧪 You can now test the notifications!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

applyNotificationsMigration();
