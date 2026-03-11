import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://elysrdqujzlbvnjfilvh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDczOTQ0MCwiZXhwIjoyMDQ2MzE1NDQwfQ.Ry3yK8sM8EYQ2S-M3wTcl7AJXzZo7w8c53lH1YPLqOs',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function resetPassword() {
  console.log('🔑 Réinitialisation du mot de passe...\n');

  // Mettre à jour le mot de passe pour denis@neira.test
  const { data, error } = await supabase.auth.admin.updateUserById(
    '37703f62-286e-43ce-a5c3-d939dd34e3f8',
    { password: 'Denis2026!Test' }
  );

  if (error) {
    console.error('❌ Erreur:', error);
  } else {
    console.log('✅ Mot de passe mis à jour: Denis2026!Test');
    console.log('   Pour: denis@neira.test');
  }
}

resetPassword().catch(console.error);
