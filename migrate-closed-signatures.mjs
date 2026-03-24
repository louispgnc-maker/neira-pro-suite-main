#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les deux fichiers .env
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('📋 Configuration:');
console.log(`   Supabase URL: ${supabaseUrl ? '✅' : '❌'}`);
console.log(`   Supabase Key: ${supabaseKey ? '✅' : '❌'}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Variables d\'environnement manquantes');
  console.error('Vérifiez que .env.local contient VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const UNIVERSIGN_API_URL = process.env.UNIVERSIGN_API_URL || 'https://api.alpha.universign.com';
const UNIVERSIGN_API_KEY = process.env.UNIVERSIGN_API_KEY;
const UNIVERSIGN_USERNAME = process.env.UNIVERSIGN_USERNAME;
const UNIVERSIGN_PASSWORD = process.env.UNIVERSIGN_PASSWORD;

async function migrateClosedSignatures() {
  console.log('🔄 Migration des signatures fermées sans document signé...\n');

  // Trouver toutes les signatures fermées sans signed_document_path
  const { data: signatures, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('status', 'fermee')
    .is('signed_document_path', null)
    .not('transaction_id', 'is', null);

  if (error) {
    console.error('❌ Erreur récupération signatures:', error);
    return;
  }

  if (!signatures || signatures.length === 0) {
    console.log('✅ Aucune signature fermée à migrer');
    return;
  }

  console.log(`📋 ${signatures.length} signature(s) fermée(s) trouvée(s)\n`);

  // Afficher les infos avant de continuer
  console.log('📊 Aperçu des signatures:');
  for (const sig of signatures) {
    console.log(`   - ID: ${sig.id.substring(0, 8)}... | signed_count: ${sig.signed_count || 0} | signatories: ${sig.signatories?.length || 0}`);
  }
  console.log('');

  // Si aucune signature collectée dans toutes les transactions, arrêter
  const hasAnySignatures = signatures.some(s => (s.signed_count || 0) > 0);
  if (!hasAnySignatures) {
    console.log('ℹ️  Aucune signature collectée dans ces transactions - rien à migrer');
    return;
  }

  // Préparer headers authentification Universign
  const headers = {};
  if (UNIVERSIGN_API_KEY) {
    headers['Authorization'] = `Bearer ${UNIVERSIGN_API_KEY}`;
    console.log('🔑 Authentification Universign: API Key');
  } else if (UNIVERSIGN_USERNAME && UNIVERSIGN_PASSWORD) {
    const credentials = btoa(`${UNIVERSIGN_USERNAME}:${UNIVERSIGN_PASSWORD}`);
    headers['Authorization'] = `Basic ${credentials}`;
    console.log('🔑 Authentification Universign: Basic Auth');
  } else {
    console.error('❌ Aucune credentials Universign configurées');
    return;
  }

  console.log('');

  for (const signature of signatures) {
    console.log(`\n📄 Traitement signature: ${signature.id}`);
    console.log(`   Transaction ID: ${signature.transaction_id}`);

    try {
      // Récupérer les données de la transaction
      const statusEndpoint = `${UNIVERSIGN_API_URL}/v1/transactions/${signature.transaction_id}`;
      const statusResponse = await fetch(statusEndpoint, { method: 'GET', headers });

      if (!statusResponse.ok) {
        console.error(`   ❌ Impossible de récupérer la transaction (${statusResponse.status})`);
        continue;
      }

      const transactionData = await statusResponse.json();
      console.log(`   ✅ Transaction récupérée`);

      // Compter les signataires qui ont signé
      let signedCount = 0;
      let updatedSignatories = signature.signatories || [];

      if (transactionData.participants && signature.signatories) {
        updatedSignatories = signature.signatories.map((signer) => {
          const participant = transactionData.participants.find((p) => p.email === signer.email);
          if (participant) {
            const signerStatus = participant.signed === true ? 'signe' : 'non_signe';
            if (participant.signed === true) signedCount++;
            console.log(`   👤 ${signer.email}: ${signerStatus}`);
            return {
              ...signer,
              status: signerStatus
            };
          }
          return {
            ...signer,
            status: 'non_signe'
          };
        });
      }

      console.log(`   ✍️  ${signedCount} signataire(s) ont signé`);

      // Télécharger le document signé si au moins 1 signature
      let signedDocumentPath = null;

      if (signedCount > 0 && transactionData.documents && transactionData.documents.length > 0) {
        console.log(`   📥 Téléchargement du document signé partiel...`);

        const documentId = transactionData.documents[0].id;
        const downloadUrl = `${UNIVERSIGN_API_URL}/v1/documents/${documentId}/download`;

        const downloadResponse = await fetch(downloadUrl, {
          method: 'GET',
          headers
        });

        if (downloadResponse.ok) {
          const arrayBuffer = await downloadResponse.arrayBuffer();
          const blob = new Blob([arrayBuffer], { type: 'application/pdf' });

          console.log(`   📦 Document téléchargé: ${blob.size} bytes`);

          // Upload dans Storage
          const timestamp = Date.now();
          const fileName = `signed/${signature.id}_${timestamp}.pdf`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, blob, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (uploadError) {
            console.error(`   ❌ Erreur upload:`, uploadError.message);
          } else {
            console.log(`   ✅ Document uploadé: ${fileName}`);
            signedDocumentPath = fileName;
          }
        } else {
          const errorText = await downloadResponse.text();
          console.error(`   ❌ Erreur téléchargement (${downloadResponse.status}):`, errorText);
        }
      } else if (signedCount === 0) {
        console.log(`   ℹ️  Aucune signature collectée - pas de document à télécharger`);
      }

      // Mettre à jour la base de données
      const { error: updateError } = await supabase
        .from('signatures')
        .update({
          signatories: updatedSignatories,
          signed_count: signedCount,
          signed_document_path: signedDocumentPath
        })
        .eq('id', signature.id);

      if (updateError) {
        console.error(`   ❌ Erreur mise à jour:`, updateError.message);
      } else {
        console.log(`   ✅ Signature mise à jour`);
      }

    } catch (error) {
      console.error(`   ❌ Erreur:`, error.message);
    }
  }

  console.log('\n✨ Migration terminée!');
}

migrateClosedSignatures().catch(console.error);
