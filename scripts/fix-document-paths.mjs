import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CLIENT_ID = '201f03a0-f199-467a-9300-e9712d6aa2f5';
const CORRECT_CABINET_ID = '1f479030-cfa8-48c6-bfcb-5264f16f608f';

async function fixDocumentPaths() {
  console.log('🔍 Récupération des documents avec paths incorrects...\n');

  // Get all documents for this client
  const { data: documents, error } = await supabase
    .from('client_shared_documents')
    .select('*')
    .eq('client_id', CLIENT_ID);

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  console.log(`📄 ${documents.length} documents trouvés\n`);

  for (const doc of documents) {
    // Check if URL has wrong cabinet_id
    if (doc.file_url.includes(CORRECT_CABINET_ID)) {
      console.log(`✅ ${doc.title} - Path déjà correct`);
      continue;
    }

    console.log(`\n🔧 Traitement: ${doc.title}`);
    console.log(`   Old URL: ${doc.file_url}`);

    // Extract the old path from URL
    const urlMatch = doc.file_url.match(/shared-documents\/(.+)$/);
    if (!urlMatch) {
      console.log('   ⚠️  Cannot parse URL, skipping');
      continue;
    }

    const oldPath = urlMatch[1];
    console.log(`   Old path: ${oldPath}`);

    // Try to download the file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('shared-documents')
      .download(oldPath);

    if (downloadError) {
      console.log(`   ❌ Cannot download: ${downloadError.message}`);
      continue;
    }

    console.log(`   ✓ File downloaded (${fileData.size} bytes)`);

    // Create new path with correct cabinet_id
    const fileName = oldPath.split('/').pop();
    const newPath = `${CORRECT_CABINET_ID}/${CLIENT_ID}/${fileName}`;
    console.log(`   New path: ${newPath}`);

    // Upload to new location
    const { error: uploadError } = await supabase.storage
      .from('shared-documents')
      .upload(newPath, fileData, {
        contentType: doc.file_type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.log(`   ❌ Cannot upload: ${uploadError.message}`);
      continue;
    }

    console.log(`   ✓ File uploaded to new location`);

    // Get new public URL
    const { data: publicUrlData } = supabase.storage
      .from('shared-documents')
      .getPublicUrl(newPath);

    const newUrl = publicUrlData.publicUrl;
    console.log(`   New URL: ${newUrl}`);

    // Update database
    const { error: updateError } = await supabase
      .from('client_shared_documents')
      .update({ file_url: newUrl })
      .eq('id', doc.id);

    if (updateError) {
      console.log(`   ❌ Cannot update database: ${updateError.message}`);
      continue;
    }

    console.log(`   ✅ Database updated`);

    // Delete old file
    const { error: deleteError } = await supabase.storage
      .from('shared-documents')
      .remove([oldPath]);

    if (deleteError) {
      console.log(`   ⚠️  Old file not deleted: ${deleteError.message}`);
    } else {
      console.log(`   ✓ Old file deleted`);
    }

    console.log(`   ✅ Migration complete for ${doc.title}`);
  }

  console.log('\n✨ Migration terminée !');
}

fixDocumentPaths().catch(console.error);
