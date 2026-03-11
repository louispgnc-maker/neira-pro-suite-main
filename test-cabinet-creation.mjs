import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://elysrdqujzlbvnjfilvh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjMzMTQsImV4cCI6MjA3NzczOTMxNH0.ItqpqcgP_FFqvmx-FunQv0RmCI9EATJlUWuYmw0zPvA'
);

async function testCabinetCreation() {
  console.log('🧪 Test de création de cabinet pour compte test...\n');

  // 1. Se connecter comme denis
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'denis@neira.test',
    password: 'Denis2026!Test'
  });

  if (authError) {
    console.error('❌ Erreur connexion:', authError);
    return;
  }

  console.log('✅ Connecté comme:', authData.user.email);
  console.log('');

  // 2. Créer le cabinet via RPC
  console.log('⏳ Création du cabinet...');
  const { data: cabinetId, error: cabinetError } = await supabase.rpc('create_cabinet', {
    nom_param: 'Cabinet Denis Test',
    raison_sociale_param: 'SELARL Denis Test',
    siret_param: '12345678900001',
    adresse_param: '10 rue du Test',
    code_postal_param: '75001',
    ville_param: 'Paris',
    telephone_param: '0123456789',
    role_param: 'avocat'
  });

  if (cabinetError) {
    console.error('❌ Erreur création cabinet:', cabinetError);
    return;
  }

  console.log('✅ Cabinet créé avec ID:', cabinetId);
  console.log('');

  // 3. Vérifier que le cabinet a bien Cabinet-Plus
  const { data: cabinet, error: checkError } = await supabase
    .from('cabinets')
    .select('id, nom, subscription_tier, max_members, subscription_status')
    .eq('id', cabinetId)
    .single();

  if (checkError) {
    console.error('❌ Erreur vérification:', checkError);
    return;
  }

  console.log('📊 Résultat:');
  console.log('   Nom:', cabinet.nom);
  console.log('   Tier:', cabinet.subscription_tier);
  console.log('   Max membres:', cabinet.max_members === null ? 'Illimité' : cabinet.max_members);
  console.log('   Statut:', cabinet.subscription_status);
  console.log('');

  if (cabinet.subscription_tier === 'cabinet-plus' && cabinet.max_members === null) {
    console.log('✅ SUCCESS: Le compte test a été auto-upgradé vers Cabinet-Plus !');
  } else {
    console.log('❌ ÉCHEC: Le cabinet n\'a pas été upgradé correctement');
    console.log('   Attendu: subscription_tier=cabinet-plus, max_members=null');
    console.log('   Reçu: subscription_tier=' + cabinet.subscription_tier + ', max_members=' + cabinet.max_members);
  }
}

testCabinetCreation().catch(console.error);
