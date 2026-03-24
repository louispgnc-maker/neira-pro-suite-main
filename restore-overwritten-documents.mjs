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
console.log(`   Supabase Key: ${supabaseKey ? '✅' : '❌'}\n`);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreDocuments() {
  console.log('🔄 Recherche des documents écrasés par les signatures...\n');

  // Trouver tous les documents dont le storage_path commence par "signed/"
  const { data: documents, error: docError } = await supabase
    .from('documents')
    .select('*')
    .like('storage_path', 'signed/%');

  if (docError) {
    console.error('❌ Erreur récupération documents:', docError);
    return;
  }

  if (!documents || documents.length === 0) {
    console.log('✅ Aucun document écrasé trouvé - tout est OK!');
    return;
  }

  console.log(`📄 ${documents.length} document(s) écrasé(s) trouvé(s):\n`);

  for (const doc of documents) {
    console.log(`\n📝 Document: ${doc.name} (${doc.id.substring(0, 8)}...)`);
    console.log(`   ❌ storage_path écrasé: ${doc.storage_path}`);

    // Chercher la signature correspondante pour trouver le document original
    const { data: signature, error: sigError } = await supabase
      .from('signatures')
      .select('*')
      .or(`document_id.eq.${doc.id},item_id.eq.${doc.id}`)
      .single();

    if (sigError || !signature) {
      console.log(`   ⚠️  Signature non trouvée - impossible de restaurer automatiquement`);
      
      // Lister les fichiers dans Storage pour ce document
      const bucketPath = `personal/${doc.owner_id}`;
      const { data: files, error: listError } = await supabase.storage
        .from('documents')
        .list(bucketPath);

      if (files && files.length > 0) {
        console.log(`   📁 Fichiers trouvés dans ${bucketPath}:`);
        for (const file of files) {
          if (file.name.includes('.pdf')) {
            console.log(`      - ${file.name}`);
          }
        }
      }
      continue;
    }

    console.log(`   ✅ Signature trouvée: ${signature.id.substring(0, 8)}...`);

    // Le document original peut être dans plusieurs endroits
    let originalPath = null;

    // 1. Si c'est un item_type='document', l'original devrait être dans document_url
    if (signature.item_type === 'document' && signature.document_url) {
      console.log(`   💡 document_url trouvé: ${signature.document_url}`);
      originalPath = signature.document_url
        .replace(/^https:\/\/[^\/]+\/storage\/v1\/object\/public\/documents\//, '');
    }

    // 2. Chercher dans dossier_documents
    if (!originalPath && signature.item_type === 'dossier' && signature.item_id) {
      const { data: dossierDocs } = await supabase
        .from('dossier_documents')
        .select('documents(storage_path)')
        .eq('dossier_id', signature.item_id)
        .limit(1);

      if (dossierDocs && dossierDocs.length > 0) {
        const docData = dossierDocs[0].documents;
        if (docData && docData.storage_path && !docData.storage_path.startsWith('signed/')) {
          originalPath = docData.storage_path;
          console.log(`   💡 Trouvé via dossier_documents: ${originalPath}`);
        }
      }
    }

    if (originalPath) {
      console.log(`   ✅ Document original trouvé: ${originalPath}`);
      console.log(`   🔄 Restauration...`);

      const { error: updateError } = await supabase
        .from('documents')
        .update({ 
          storage_path: originalPath,
          signed_at: null // Enlever le marqueur "signé" car c'est le document original
        })
        .eq('id', doc.id);

      if (updateError) {
        console.error(`   ❌ Erreur restauration:`, updateError.message);
      } else {
        console.log(`   ✅ Document restauré!`);
      }
    } else {
      console.log(`   ⚠️  Impossible de trouver le document original`);
      console.log(`   💡 Le document signé reste accessible via signatures.signed_document_path: ${signature.signed_document_path || 'N/A'}`);
    }
  }

  console.log('\n✨ Traitement terminé!');
}

restoreDocuments().catch(console.error);
