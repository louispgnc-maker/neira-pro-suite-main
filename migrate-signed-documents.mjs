#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const universignApiUrl = process.env.UNIVERSIGN_API_URL || 'https://api.alpha.universign.com';
const universignApiKey = process.env.UNIVERSIGN_API_KEY;
const universignUsername = process.env.UNIVERSIGN_USERNAME;
const universignPassword = process.env.UNIVERSIGN_PASSWORD;

if (!universignApiKey && (!universignUsername || !universignPassword)) {
  console.error('❌ Universign credentials required (UNIVERSIGN_API_KEY or UNIVERSIGN_USERNAME + UNIVERSIGN_PASSWORD)');
  process.exit(1);
}

// Prepare auth headers
const headers = {
  'Content-Type': 'application/json'
};

if (universignApiKey) {
  headers['Authorization'] = `Bearer ${universignApiKey}`;
} else {
  const credentials = Buffer.from(`${universignUsername}:${universignPassword}`).toString('base64');
  headers['Authorization'] = `Basic ${credentials}`;
}

async function migrateSignedDocuments() {
  console.log('🔍 Recherche des signatures avec documents manquants...\n');

  // Find signatures that are signed but don't have signed_document_path
  const { data: signatures, error } = await supabase
    .from('signatures')
    .select('id, transaction_id, document_id, status, documents(name)')
    .eq('status', 'signed')
    .is('signed_document_path', null);

  if (error) {
    console.error('❌ Erreur lors de la récupération des signatures:', error);
    return;
  }

  if (!signatures || signatures.length === 0) {
    console.log('✅ Aucune signature à migrer!');
    return;
  }

  console.log(`📦 ${signatures.length} signature(s) trouvée(s)\n`);

  for (const signature of signatures) {
    console.log(`\n📄 Signature: ${signature.id}`);
    console.log(`   Transaction: ${signature.transaction_id}`);

    try {
      // Try to get transaction info from Universign
      console.log('   🔄 Récupération de la transaction depuis Universign...');
      
      const transactionUrl = `${universignApiUrl}/v1/transactions/${signature.transaction_id}`;
      const transactionResponse = await fetch(transactionUrl, {
        method: 'GET',
        headers
      });

      if (!transactionResponse.ok) {
        const errorText = await transactionResponse.text();
        console.error(`   ❌ Erreur Universign (${transactionResponse.status}):`, errorText.substring(0, 200));
        
        // Si l'API REST ne marche pas, essayer avec l'URL directe du document
        // En général, pour l'API Alpha, il faudrait utiliser SOAP/XML-RPC
        console.log('   ⚠️  L\'API REST ne semble pas disponible. Le document doit être téléchargé manuellement.');
        console.log(`   🔗 Lien Universign: ${signature.universign_url || 'non disponible'}`);
        continue;
      }

      const transaction = await transactionResponse.json();
      console.log('   ✅ Transaction récupérée');

      if (!transaction.documents || transaction.documents.length === 0) {
        console.log('   ⚠️  Aucun document dans la transaction');
        continue;
      }

      const documentId = transaction.documents[0].id;
      console.log(`   📥 Téléchargement du document: ${documentId}`);

      // Download the signed document
      const downloadUrl = `${universignApiUrl}/v1/documents/${documentId}/download`;
      const downloadResponse = await fetch(downloadUrl, {
        method: 'GET',
        headers
      });

      if (!downloadResponse.ok) {
        const errorText = await downloadResponse.text();
        console.error(`   ❌ Erreur téléchargement (${downloadResponse.status}):`, errorText.substring(0, 200));
        continue;
      }

      const signedPdfBlob = await downloadResponse.blob();
      const signedPdfBuffer = Buffer.from(await signedPdfBlob.arrayBuffer());
      console.log(`   📦 Document téléchargé (${Math.round(signedPdfBuffer.length / 1024)} KB)`);

      // Upload to Storage
      const timestamp = Date.now();
      const fileName = `signed/${signature.document_id || signature.id}_${timestamp}.pdf`;

      console.log(`   ⬆️  Upload vers Storage: ${fileName}`);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, signedPdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error('   ❌ Erreur upload Storage:', uploadError);
        continue;
      }

      console.log('   ✅ Document uploadé dans Storage');

      // Update signature record
      const { error: updateError } = await supabase
        .from('signatures')
        .update({ signed_document_path: fileName })
        .eq('id', signature.id);

      if (updateError) {
        console.error('   ❌ Erreur mise à jour signature:', updateError);
        continue;
      }

      console.log('   ✅ Signature mise à jour');

      // Update document record if exists
      if (signature.document_id) {
        const { error: docUpdateError } = await supabase
          .from('documents')
          .update({
            storage_path: fileName,
            signed_at: new Date().toISOString()
          })
          .eq('id', signature.document_id);

        if (!docUpdateError) {
          console.log('   ✅ Document mis à jour');
        }
      }

      console.log('   🎉 Migration réussie!');

    } catch (err) {
      console.error('   ❌ Erreur:', err.message);
    }
  }

  console.log('\n✅ Migration terminée!');
}

migrateSignedDocuments().catch(console.error);
