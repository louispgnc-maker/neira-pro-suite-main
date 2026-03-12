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

async function checkDossierId() {
  const dossierId = 'c35b48af-c1e3-4e5f-968a-4f63b1f99f01';
  
  console.log('🔍 Recherche du dossier:', dossierId, '\n');
  
  // Vérifier dans client_dossiers_new
  const { data: newDossier } = await supabase
    .from('client_dossiers_new')
    .select('*')
    .eq('id', dossierId)
    .single();
  
  if (newDossier) {
    console.log('✅ Trouvé dans client_dossiers_new:', newDossier);
  } else {
    console.log('❌ PAS dans client_dossiers_new');
  }
  
  // Vérifier dans dossiers
  const { data: oldDossier } = await supabase
    .from('dossiers')
    .select('*')
    .eq('id', dossierId)
    .single();
  
  if (oldDossier) {
    console.log('✅ Trouvé dans dossiers (ancienne table):', oldDossier);
  } else {
    console.log('❌ PAS dans dossiers');
  }
}

checkDossierId();
