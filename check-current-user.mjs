import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // Service key pour voir tout

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  console.log('👥 Vérification des utilisateurs...\n');

  // Récupérer tous les utilisateurs (nécessite service role key)
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  console.log(`✅ ${users.length} utilisateurs trouvés:\n`);

  for (const user of users) {
    console.log(`📧 ${user.email}`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Créé: ${new Date(user.created_at).toLocaleString()}`);
    
    // Compter les clients de cet utilisateur
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, role')
      .eq('owner_id', user.id);
    
    if (clients && clients.length > 0) {
      console.log(`   - Clients: ${clients.length}`);
      clients.forEach(c => {
        console.log(`     • ${c.name} (${c.role})`);
      });
    } else {
      console.log(`   - Clients: 0`);
    }
    console.log('');
  }
}

checkUsers();
