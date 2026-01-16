import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const email = 'louispoignonec@essca.eu';

// Chercher dans auth.users via RPC ou direct query
const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

if (usersError) {
  console.error('Erreur:', usersError);
  process.exit(1);
}

const user = users?.users?.find(u => u.email === email);

if (!user) {
  console.log(`❌ Utilisateur ${email} non trouvé`);
  process.exit(1);
}

console.log(`✅ User trouvé: ${user.id}\n`);

// Vérifier dans clients
const { data: client } = await supabase
  .from('clients')
  .select('*')
  .eq('user_id', user.id)
  .maybeSingle();

console.log('📋 STATUT CLIENT:', client ? '✅ OUI' : '❌ NON');
if (client) {
  console.log('   Client ID:', client.id);
  console.log('   Nom:', client.nom, client.prenom);
}

// Vérifier dans cabinet_members
const { data: member } = await supabase
  .from('cabinet_members')
  .select('cabinet_id, role')
  .eq('user_id', user.id)
  .maybeSingle();

console.log('\n🏢 STATUT PROFESSIONNEL:', member ? '✅ OUI' : '❌ NON');
if (member) {
  console.log('   Cabinet ID:', member.cabinet_id);
  console.log('   Rôle:', member.role);
}

// Si les deux existent, c'est un problème
if (client && member) {
  console.log('\n⚠️  CONFLIT: Cet utilisateur a les 2 rôles!');
  console.log('   → Il faut supprimer l\'entrée client pour garder uniquement le rôle professionnel');
  console.log('\n💡 Pour nettoyer:');
  console.log(`   DELETE FROM clients WHERE id = '${client.id}';`);
}
