#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDocuments() {
  console.log('📄 Vérification des documents dans la base...\n');

  // Récupérer tous les documents
  const { data: allDocs, error } = await supabase
    .from('documents')
    .select('id, name, owner_id, role, storage_path, client_name, status, updated_at')
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  if (!allDocs || allDocs.length === 0) {
    console.log('❌ Aucun document trouvé dans la base');
    return;
  }

  console.log(`✅ ${allDocs.length} document(s) trouvé(s) (20 plus récents):\n`);

  for (const doc of allDocs) {
    console.log(`📝 ${doc.name}`);
    console.log(`   ID: ${doc.id.substring(0, 8)}...`);
    console.log(`   Owner: ${doc.owner_id.substring(0, 8)}...`);
    console.log(`   Role: ${doc.role}`);
    console.log(`   Status: ${doc.status || 'N/A'}`);
    console.log(`   Storage: ${doc.storage_path || 'N/A'}`);
    console.log(`   Updated: ${doc.updated_at || 'N/A'}`);
    console.log('');
  }
}

checkDocuments().catch(console.error);
