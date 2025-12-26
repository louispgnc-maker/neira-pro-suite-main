import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE2MzMxNCwiZXhwIjoyMDc3NzM5MzE0fQ.gVTXZg1hE0Dk7-I6GZ_Kn7SDLfhXZQP4Y8e-bPe4TWE';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addColumn() {
  console.log('🔧 Ajout de la colonne contenu_json à la table contrats...');
  
  try {
    // Essayer d'abord de lire un contrat pour voir la structure actuelle
    const { data: testData, error: testError } = await supabase
      .from('contrats')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Erreur lors du test de la table:', testError);
      return;
    }
    
    console.log('✅ Table contrats accessible');
    if (testData && testData.length > 0) {
      console.log('📋 Colonnes actuelles:', Object.keys(testData[0]));
      
      if ('contenu_json' in testData[0]) {
        console.log('✅ La colonne contenu_json existe déjà !');
        return;
      }
    }
    
    console.log('');
    console.log('⚠️  La colonne contenu_json n\'existe pas encore.');
    console.log('');
    console.log('📝 Pour l\'ajouter, exécutez ce SQL dans le Dashboard Supabase:');
    console.log('   https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/sql/new');
    console.log('');
    console.log('```sql');
    const sqlContent = fs.readFileSync('./ADD_CONTENU_JSON_COLUMN.sql', 'utf8');
    console.log(sqlContent);
    console.log('```');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

addColumn();
