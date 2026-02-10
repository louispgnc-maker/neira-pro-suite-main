import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE2MzMxNCwiZXhwIjoyMDc3NzM5MzE0fQ.sR6o9PVKYtQlthqjx5JA8gAEb0FqJxO3uwxpR9uOQFo';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' }
});

console.log('🔧 Application de la migration founder_role...\n');

const sql = readFileSync('./supabase/migrations/2025-11-06_founder_role.sql', 'utf8');

try {
  // Exécuter le SQL directement via la connexion Postgres REST
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('❌ Erreur lors de l\'exécution:', error.message);
    console.log('\n⚠️  La fonction exec_sql n\'existe pas. Veuillez appliquer la migration manuellement :');
    console.log('\n1. Allez sur https://elysrdqujzlbvnjfilvh.supabase.co');
    console.log('2. Ouvrez le SQL Editor');
    console.log('3. Copiez/collez le contenu de : supabase/migrations/2025-11-06_founder_role.sql');
    console.log('4. Exécutez la requête\n');
    process.exit(1);
  }
  
  console.log('✅ Migration founder_role appliquée avec succès !');
  console.log('   - Rôle "owner" migré vers "Fondateur"');
  console.log('   - Fonction create_cabinet mise à jour');
  console.log('   - Tous les nouveaux cabinets auront un Fondateur');
  
} catch (err) {
  console.error('❌ Erreur:', err.message);
  console.log('\n📋 Veuillez appliquer la migration manuellement via le SQL Editor de Supabase');
  process.exit(1);
}
