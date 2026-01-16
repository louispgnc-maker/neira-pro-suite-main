import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const email = 'louispoignonec@essca.eu';

console.log(`🔍 Recherche de ${email}...\n`);

// Chercher dans clients directement par email
const { data: client } = await supabase
  .from('clients')
  .select('*')
  .eq('email', email)
  .maybeSingle();

console.log('📋 ENTRÉE CLIENT:', client ? '✅ EXISTE' : '❌ N\'EXISTE PAS');
if (client) {
  console.log('   Client ID:', client.id);
  console.log('   Nom:', client.prenom, client.nom);
  console.log('   User ID:', client.user_id);
  console.log('   Created:', client.created_at);
}

console.log('\n⚠️  Ce compte devrait UNIQUEMENT être professionnel, pas client.');
console.log('💡 Pour nettoyer, supprimez l\'entrée client:');
if (client) {
  console.log(`\n   DELETE FROM clients WHERE id = '${client.id}';\n   DELETE FROM cabinet_clients WHERE client_id = '${client.id}';`);
}
