/**
 * Test RPC: adapte les paramètres p_cabinet_id / p_document_id si besoin.
 * Utilise dotenv pour charger .env à la racine.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Erreur: SUPABASE_URL ou SUPABASE_ANON_KEY non défini dans .env');
  process.exit(1);
}
const supabase = createClient(url, key);

// Optionnel: authentifier un utilisateur de test si on fournit des identifiants
const testEmail = process.env.SUPABASE_TEST_EMAIL;
const testPassword = process.env.SUPABASE_TEST_PASSWORD;

if (testEmail && testPassword) {
  console.log('Signing in as', testEmail);
  const { data: signData, error: signErr } = await supabase.auth.signInWithPassword({ email: testEmail, password: testPassword });
  if (signErr) {
    console.error('Sign-in failed:', signErr);
    process.exitCode = 1;
    // continue to attempt RPC (it will likely fail with auth.uid() null)
  } else {
    console.log('Signed in, user id:', signData?.user?.id);
  }
} else {
  console.log('No test credentials provided; calling RPC as anon (no auth.uid.).');
}

// Paramètres de test (peuvent être surchargés via .env)
const cabinetId = process.env.TEST_CABINET_ID || '00000000-0000-0000-0000-000000000000';
const documentId = process.env.TEST_DOCUMENT_ID || '00000000-0000-0000-0000-000000000000';
const fileUrl = process.env.TEST_FILE_URL || 'https://example.com/fake.pdf';
const title = process.env.TEST_TITLE || 'Test RPC';

try {
  const res = await supabase.rpc('share_document_to_cabinet_with_url', {
    cabinet_id_param: cabinetId,
    document_id_param: documentId,
    title_param: title,
    file_url_param: fileUrl
  });
  console.log('=== RPC RESPONSE ===');
  console.log(JSON.stringify(res, null, 2));
} catch (err) {
  console.error('RPC call failed:', err);
  process.exitCode = 1;
}
