import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const email = 'louispoignonec@essca.eu';

console.log(`🔧 Création entrée client pour ${email}...\n`);

// Récupérer l'invitation existante
const { data: invitation } = await supabase
  .from('client_invitations')
  .select('*')
  .eq('email', 'louis.poignonec@essca.eu') // avec point
  .maybeSingle();

if (!invitation) {
  console.log('❌ Aucune invitation trouvée');
  process.exit(1);
}

console.log('✅ Invitation trouvée:', invitation.access_code);
console.log('   Client ID:', invitation.client_id);

// Vérifier si le client existe déjà
const { data: existingClient } = await supabase
  .from('clients')
  .select('*')
  .eq('id', invitation.client_id)
  .maybeSingle();

if (existingClient) {
  console.log('\n✅ Client existe déjà:', existingClient.id);
  
  // Il faut juste lier le user_id
  // Récupérer le user_id depuis auth
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users?.find(u => u.email === email);
  
  if (!user) {
    console.log('❌ User auth non trouvé');
    process.exit(1);
  }
  
  console.log('✅ User ID:', user.id);
  
  // UPDATE le client avec le user_id
  const { error: updateError } = await supabase
    .from('clients')
    .update({ user_id: user.id })
    .eq('id', existingClient.id);
  
  if (updateError) {
    console.log('❌ Erreur update:', updateError);
  } else {
    console.log('✅ Client lié au user_id !');
  }
} else {
  console.log('❌ Client n\'existe pas dans la table clients');
}
