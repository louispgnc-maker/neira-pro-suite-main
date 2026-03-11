import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClients() {
  console.log('🔍 Vérification des clients...\n');

  // Récupérer tous les clients
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, nom, prenom, siret, role, owner_id, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  if (!clients || clients.length === 0) {
    console.log('⚠️  Aucun client trouvé dans la base de données');
    return;
  }

  console.log(`✅ ${clients.length} clients trouvés:\n`);

  clients.forEach((client, index) => {
    console.log(`${index + 1}. Client:`);
    console.log(`   - name field: "${client.name || 'NULL'}"`);
    console.log(`   - prenom: "${client.prenom || 'NULL'}"`);
    console.log(`   - nom: "${client.nom || 'NULL'}"`);
    console.log(`   - ID: ${client.id}`);
    console.log(`   - Owner ID: ${client.owner_id}`);
    console.log(`   - Role: ${client.role}`);
    console.log(`   - Type: ${client.siret ? '🏢 ENTREPRISE (SIRET: ' + client.siret + ')' : '👤 PARTICULIER'}`);
    console.log(`   - Créé le: ${new Date(client.created_at).toLocaleString()}`);
    console.log('');
  });

  // Statistiques
  const avocatClients = clients.filter(c => c.role === 'avocat');
  const notaireClients = clients.filter(c => c.role === 'notaire');
  const entreprises = clients.filter(c => c.siret);
  const particuliers = clients.filter(c => !c.siret);

  console.log('📊 Statistiques:');
  console.log(`   - Clients avocat: ${avocatClients.length}`);
  console.log(`   - Clients notaire: ${notaireClients.length}`);
  console.log(`   - Entreprises: ${entreprises.length}`);
  console.log(`   - Particuliers: ${particuliers.length}`);
}

checkClients();
