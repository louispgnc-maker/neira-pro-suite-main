import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDU0MDYzOCwiZXhwIjoyMDUwMTE2NjM4fQ.p_VN4DDyPQR1SIKauZ56VKSNaQjZtP-ynowWyqrNYxU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixClientSharedDocumentsUrls() {
  console.log('🔍 Récupération de tous les fichiers du bucket shared-documents...');
  
  // Récupérer tous les fichiers du bucket
  const allFiles = [];
  const folders = ['243ed8b0-3d58-47eb-b518-791fac0ba71f', '1f479030-cfa8-48c6-bfcb-5264f16f608f', 'f4cc3123-058e-4e3a-9ca9-bc06d7a24957'];
  
  for (const folder of folders) {
    const { data: files, error } = await supabase.storage
      .from('shared-documents')
      .list(folder, { limit: 1000 });
    
    if (error) {
      console.error(`Erreur listage ${folder}:`, error);
      continue;
    }
    
    files.forEach(file => {
      allFiles.push({
        fullPath: `${folder}/${file.name}`,
        fileName: file.name.split('-').slice(-1)[0] || file.name // Extraire le nom de fichier sans préfixe
      });
    });
  }
  
  console.log(`📁 ${allFiles.length} fichiers trouvés dans le bucket`);
  
  // Récupérer tous les documents de la table
  const { data: docs, error: docsError } = await supabase
    .from('client_shared_documents')
    .select('id, file_name, file_url');
  
  if (docsError) {
    console.error('Erreur récupération documents:', docsError);
    return;
  }
  
  console.log(`📄 ${docs.length} documents dans la table client_shared_documents`);
  
  // Mettre à jour chaque document
  let updated = 0;
  let notFound = 0;
  
  for (const doc of docs) {
    // Chercher le fichier correspondant par nom
    const matchingFile = allFiles.find(f => f.fileName === doc.file_name || f.fullPath.endsWith(doc.file_name));
    
    if (matchingFile) {
      const fullUrl = `${supabaseUrl}/storage/v1/object/public/shared-documents/${matchingFile.fullPath}`;
      
      // Mettre à jour seulement si l'URL n'est pas déjà correcte
      if (doc.file_url !== fullUrl) {
        const { error: updateError } = await supabase
          .from('client_shared_documents')
          .update({ file_url: fullUrl })
          .eq('id', doc.id);
        
        if (updateError) {
          console.error(`❌ Erreur mise à jour ${doc.file_name}:`, updateError);
        } else {
          console.log(`✅ ${doc.file_name} → ${matchingFile.fullPath}`);
          updated++;
        }
      }
    } else {
      console.warn(`⚠️  Fichier non trouvé dans le bucket: ${doc.file_name}`);
      notFound++;
    }
  }
  
  console.log('\n📊 Résumé:');
  console.log(`   ✅ ${updated} documents mis à jour`);
  console.log(`   ⚠️  ${notFound} fichiers non trouvés`);
  console.log(`   ℹ️  ${docs.length - updated - notFound} déjà à jour`);
}

fixClientSharedDocumentsUrls().catch(console.error);
