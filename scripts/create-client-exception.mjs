import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

console.log('🔧 Création entrée client pour louispoignonec@essca.eu...\n');

// Données du client
const clientData = {
  id: '201f03a0-f199-467a-9300-e9712d6aa2f5', // ID de l'invitation existante
  nom: 'Poignonec',
  prenom: 'Louis',
  email: 'louispoignonec@essca.eu',
  source: 'manuel'
};

// Insérer le client
const { data, error } = await supabase
  .from('clients')
  .upsert(clientData, { onConflict: 'id' })
  .select();

if (error) {
  console.error('❌ Erreur:', error);
  process.exit(1);
}

console.log('✅ Client créé/mis à jour !');
console.log('   ID:', data[0].id);
console.log('   Nom:', data[0].prenom, data[0].nom);
console.log('   Email:', data[0].email);

console.log('\n🎯 Vous pouvez maintenant accéder à l\'espace client avec cet email !');
