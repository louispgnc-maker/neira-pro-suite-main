// Script Node.js pour ajouter la colonne contenu_json
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE2MzMxNCwiZXhwIjoyMDc3NzM5MzE0fQ.gVTXZg1hE0Dk7-I6GZ_Kn7SDLfhXZQP4Y8e-bPe4TWE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumn() {
  console.log('🔧 Ajout de la colonne contenu_json...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE contrats ADD COLUMN IF NOT EXISTS contenu_json jsonb;
      COMMENT ON COLUMN contrats.contenu_json IS 'Données du formulaire de création du contrat au format JSON (utilisé pour régénération IA)';
      CREATE INDEX IF NOT EXISTS idx_contrats_contenu_json ON contrats USING gin (contenu_json);
    `
  });

  if (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }

  console.log('✅ Colonne ajoutée avec succès !');
  
  // Vérifier que la colonne existe
  const { data: columns, error: checkError } = await supabase
    .from('contrats')
    .select('*')
    .limit(1);
  
  if (checkError) {
    console.error('⚠️ Erreur vérification:', checkError);
  } else {
    console.log('✅ Vérification: table accessible');
  }
}

addColumn();
