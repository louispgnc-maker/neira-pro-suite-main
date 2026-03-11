import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://elysrdqujzlbvnjfilvh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDU2MzQ1OSwiZXhwIjoyMDQ2MTM5NDU5fQ.Gj0lBW5_2hZmw9rvhSCbr1nvGFmP5WdNODGvBpJFvA4'
);

async function cleanupDenisAccount() {
  console.log('🧹 Nettoyage du compte denis@neira.test...\n');

  // Trouver l'utilisateur
  const { data: users } = await supabase.auth.admin.listUsers();
  const denisUser = users?.users?.find(u => u.email === 'denis@neira.test');
  
  if (!denisUser) {
    console.log('✅ Compte déjà supprimé ou inexistant');
    return;
  }

  console.log('🔍 Compte trouvé:', denisUser.id);
  console.log('');

  const userId = denisUser.id;

  // 1. Supprimer les demandes de signature
  const { error: sigError } = await supabase
    .from('signature_requests')
    .delete()
    .eq('owner_id', userId);
  console.log(sigError ? '❌ Signatures' : '✅ Signatures supprimées');

  // 2. Supprimer les contrats
  const { error: contratError } = await supabase
    .from('contrats')
    .delete()
    .eq('owner_id', userId);
  console.log(contratError ? '❌ Contrats' : '✅ Contrats supprimés');

  // 3. Supprimer les dossiers
  const { error: dossierError } = await supabase
    .from('dossiers')
    .delete()
    .eq('owner_id', userId);
  console.log(dossierError ? '❌ Dossiers' : '✅ Dossiers supprimés');

  // 4. Supprimer les clients
  const { error: clientError } = await supabase
    .from('clients')
    .delete()
    .eq('owner_id', userId);
  console.log(clientError ? '❌ Clients' : '✅ Clients supprimés');

  // 5. Trouver le cabinet
  const { data: cabinet } = await supabase
    .from('cabinets')
    .select('id')
    .eq('owner_id', userId)
    .single();

  if (cabinet) {
    // Supprimer les membres du cabinet
    await supabase
      .from('cabinet_members')
      .delete()
      .eq('cabinet_id', cabinet.id);
    console.log('✅ Membres du cabinet supprimés');

    // Supprimer les partages
    await supabase.from('cabinet_clients').delete().eq('cabinet_id', cabinet.id);
    await supabase.from('cabinet_dossiers').delete().eq('cabinet_id', cabinet.id);
    await supabase.from('cabinet_contrats').delete().eq('cabinet_id', cabinet.id);
    console.log('✅ Partages du cabinet supprimés');

    // Supprimer le cabinet
    await supabase.from('cabinets').delete().eq('id', cabinet.id);
    console.log('✅ Cabinet supprimé');
  }

  // 6. Supprimer le profil
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);
  console.log(profileError ? '❌ Profil' : '✅ Profil supprimé');

  // 7. Supprimer l'utilisateur auth
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  console.log(authError ? '❌ Utilisateur auth' : '✅ Utilisateur auth supprimé');

  console.log('\n✅ Nettoyage terminé !');
  console.log('\n📋 Le compte denis@neira.test et toutes ses données ont été supprimés.');
  console.log('   Vous pouvez le recréer avec: node configure-denis.js');
}

cleanupDenisAccount().catch(console.error);
