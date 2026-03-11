import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://elysrdqujzlbvnjfilvh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDczOTQ0MCwiZXhwIjoyMDQ2MzE1NDQwfQ.Ry3yK8sM8EYQ2S-M3wTcl7AJXzZo7w8c53lH1YPLqOs'
);

async function configureDenisAccount() {
  console.log('🔧 Configuration du compte test denis@neira.test...\n');

  // 1. Créer ou trouver l'utilisateur
  let denisUser;
  const { data: users } = await supabase.auth.admin.listUsers();
  denisUser = users?.users?.find(u => u.email === 'denis@neira.test');
  
  if (!denisUser) {
    console.log('⏳ Création du compte...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'denis@neira.test',
      password: 'Denis2026!Test',
      email_confirm: true,
      user_metadata: {
        full_name: 'Denis (Compte Test)',
        role: 'avocat'
      }
    });

    if (createError) {
      console.error('❌ Erreur création utilisateur:', createError);
      return;
    }

    denisUser = newUser.user;
    console.log('✅ Compte créé avec succès');
  } else {
    console.log('✅ Compte existant trouvé');
  }

  console.log('   ID:', denisUser.id);
  console.log('   Email:', denisUser.email);
  console.log('');

  // 2. Mettre à jour le profil et marquer comme compte test
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      role: 'avocat',
      full_name: 'Denis (Compte Test)',
      nom: 'Compte Test',
      prenom: 'Denis',
      is_test_account: true
    })
    .eq('id', denisUser.id);

  if (profileError) {
    console.error('❌ Erreur profil:', profileError);
  } else {
    console.log('✅ Profil mis à jour: Avocat (compte test)');
  }

  console.log('\n✅ Configuration terminée !');
  console.log('\n📋 Instructions pour compléter la configuration:');
  console.log('   1. Se connecter avec: denis@neira.test / Denis2026!Test');
  console.log('   2. Suivre le flux normal: Sélectionner "Avocat"');
  console.log('   3. Créer le cabinet via le formulaire');
  console.log('   4. Le compte sera automatiquement upgradé vers Cabinet-Plus 🚀');
  console.log('\n🔐 Connexion: https://neira.fr/avocats/login');
  console.log('');
}

configureDenisAccount().catch(console.error);
