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

async function explainDossierSystem() {
  const dossierId = 'c35b48af-c1e3-4e5f-968a-4f63b1f99f01';
  
  console.log('📁 EXPLICATION DU SYSTÈME DE DOSSIERS\n');
  console.log('=====================================\n');
  
  // 1. Vérifier le dossier
  console.log('1️⃣  LE DOSSIER:');
  const { data: dossier } = await supabase
    .from('dossiers')
    .select('*')
    .eq('id', dossierId)
    .single();
  
  if (dossier) {
    console.log('   ✅ Dossier trouvé dans table "dossiers":');
    console.log('      - ID:', dossier.id);
    console.log('      - Nom:', dossier.title);
    console.log('      - Owner:', dossier.owner_id);
    console.log('');
  }
  
  // 2. Vérifier les documents liés
  console.log('2️⃣  DOCUMENTS LIÉS AU DOSSIER:');
  const { data: docLinks } = await supabase
    .from('dossier_documents')
    .select('*')
    .eq('dossier_id', dossierId);
  
  if (docLinks && docLinks.length > 0) {
    console.log(`   ✅ ${docLinks.length} document(s) trouvé(s) dans table "dossier_documents":\n`);
    for (const link of docLinks) {
      console.log(`   📄 Document link:`);
      console.log(`      - Document ID: ${link.document_id}`);
      console.log(`      - Owner ID: ${link.owner_id}`);
      console.log(`      - Créé le: ${new Date(link.created_at).toLocaleString()}`);
      
      // Récupérer les infos du document
      const { data: doc } = await supabase
        .from('documents')
        .select('*')
        .eq('id', link.document_id)
        .single();
      
      if (doc) {
        console.log(`      - Nom du fichier: ${doc.name}`);
        console.log(`      - Chemin: ${doc.storage_path}`);
      }
      console.log('');
    }
  } else {
    console.log('   ❌ AUCUN document trouvé dans "dossier_documents" pour ce dossier\n');
  }
  
  // 3. Explication de l'architecture
  console.log('3️⃣  ARCHITECTURE:');
  console.log('   📊 Table "dossiers" = contient les infos du dossier');
  console.log('   📊 Table "dossier_documents" = table de liaison (dossier ↔ documents)');
  console.log('   📊 Table "documents" = contient les fichiers uploadés');
  console.log('');
  console.log('   🔗 Relation: dossier_documents.dossier_id → dossiers.id');
  console.log('   🔗 Relation: dossier_documents.document_id → documents.id');
  console.log('');
}

explainDossierSystem();
