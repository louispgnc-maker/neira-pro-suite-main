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

async function fixLouisClient() {
  console.log('🔧 Correction du client Louis Poignonec...\n');

  // Enlever le SIRET pour en faire un particulier
  const { data, error } = await supabase
    .from('clients')
    .update({ siret: null })
    .eq('id', '201f03a0-f199-467a-9300-e9712d6aa2f5')
    .select();

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  console.log('✅ Client mis à jour ! Louis Poignonec est maintenant un PARTICULIER');
  console.log('   - SIRET supprimé');
  console.log('   - Type: 👤 PARTICULIER\n');
}

fixLouisClient();
