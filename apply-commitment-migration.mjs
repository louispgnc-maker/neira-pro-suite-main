import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE2MzMxNCwiZXhwIjoyMDc3NzM5MzE0fQ.xHAqiDjqPfojpnBQn66bHuwRnXTNmD1OMRo1aKTuEQQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 Application de la migration d\'engagement...\n');

// Lire le fichier SQL
const sql = readFileSync('supabase/migrations/20260204_add_subscription_commitment.sql', 'utf-8');

// Découper en plusieurs requêtes
const queries = sql
  .split(';')
  .map(q => q.trim())
  .filter(q => q && !q.startsWith('--') && !q.startsWith('COMMENT'));

console.log(`📝 ${queries.length} requêtes à exécuter...\n`);

for (const query of queries) {
  if (!query) continue;
  
  try {
    console.log(`Exécution: ${query.substring(0, 80)}...`);
    const { error } = await supabase.rpc('exec_sql', { sql_query: query + ';' });
    
    if (error) {
      console.error('❌ Erreur:', error.message);
    } else {
      console.log('✅ OK\n');
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

console.log('\n✅ Migration terminée');
