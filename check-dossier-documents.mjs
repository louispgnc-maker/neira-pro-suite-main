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

async function checkDossierDocuments() {
  // Vérifier d'abord la nouvelle table
  console.log('🔍 Vérification table client_dossiers_new...\n');
  const { data: newDossiers } = await supabase
    .from('client_dossiers_new')
    .select('id, nom, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);

  // Vérifier aussi l'ancienne table  
  console.log('🔍 Vérification table dossiers...\n');
  const { data: oldDossiers } = await supabase
    .from('dossiers')
    .select('id, nom, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);

  const dossiers = newDossiers && newDossiers.length > 0 ? newDossiers : oldDossiers;
  const tableName = newDossiers && newDossiers.length > 0 ? 'client_dossiers_new' : 'dossiers';

  if (!dossiers || dossiers.length === 0) {
    console.log('⚠️  Aucun dossier trouvé');
    return;
  }

  console.log(`\n📁 Derniers dossiers (table: ${tableName}):\n`);
  dossiers.forEach((d, i) => {
    console.log(`${i + 1}. ${d.nom} (${d.id})`);
  });

  // Vérifier les documents de chaque dossier
  for (const dossier of dossiers) {
    console.log(`\n\n🔍 Documents du dossier "${dossier.nom}":`);
    
    const { data: docs, error } = await supabase
      .from('client_dossier_documents')
      .select('*')
      .eq('dossier_id', dossier.id);

    if (error) {
      console.error('❌ Erreur:', error);
      continue;
    }

    if (!docs || docs.length === 0) {
      console.log('   ⚠️  Aucun document associé');
    } else {
      console.log(`   ✅ ${docs.length} document(s) trouvé(s):`);
      docs.forEach((doc, i) => {
        console.log(`   ${i + 1}. "${doc.document_nom}" (source: ${doc.source}, id: ${doc.document_id})`);
      });
    }
  }
}

checkDossierDocuments();
