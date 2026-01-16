import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Vérifier tous les clients récents
const { data: clients } = await supabase
  .from('clients')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);

console.log('📋 DERNIERS CLIENTS CRÉÉS:\n');
if (clients && clients.length > 0) {
  clients.forEach(c => {
    console.log('  -', c.prenom || '?', c.nom || '?', '(' + c.email + ')');
    console.log('    ID:', c.id);
    console.log('    User ID:', c.user_id || 'NULL ⚠️');
    console.log('    Created:', c.created_at);
    console.log('');
  });
} else {
  console.log('  ❌ Aucun client dans la base\n');
}

// Vérifier spécifiquement louispoignonec@essca.eu
const { data: specific } = await supabase
  .from('clients')
  .select('*')
  .eq('email', 'louispoignonec@essca.eu')
  .maybeSingle();

console.log('\n🔍 Recherche louispoignonec@essca.eu:', specific ? '✅ TROUVÉ' : '❌ NON TROUVÉ');
if (specific) {
  console.log('   User ID:', specific.user_id);
  console.log('   Créé le:', specific.created_at);
}
