#!/usr/bin/env node

/**
 * Script pour créer un client de test rapidement
 * Usage: node scripts/create-test-client-simple.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erreur: Variables d\'environnement manquantes');
  console.error('');
  console.error('Définissez ces variables:');
  console.error('  export SUPABASE_URL="https://your-project.supabase.co"');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.error('');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createTestClient() {
  try {
    console.log('🔍 Recherche d\'un cabinet existant...');
    
    // Récupérer le premier cabinet avocat
    const { data: cabinet, error: cabinetError } = await supabase
      .from('cabinets')
      .select('id, owner_id, nom')
      .eq('role', 'avocat')
      .limit(1)
      .single();

    if (cabinetError || !cabinet) {
      console.error('❌ Aucun cabinet avocat trouvé. Créez d\'abord un compte professionnel.');
      process.exit(1);
    }

    console.log(`✅ Cabinet trouvé: ${cabinet.nom} (${cabinet.id})`);
    console.log('');

    // Créer le client
    console.log('👤 Création du client...');
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        owner_id: cabinet.owner_id,
        role: 'avocat',
        nom: 'Dupont',
        prenom: 'Marie',
        email: 'marie.dupont.test@neira.fr',
        telephone: '06 12 34 56 78',
        adresse: '123 Rue de Test, 75001 Paris',
        date_naissance: '1990-05-15',
        sexe: 'F',
        kyc_status: 'Valide',
        source: 'manual',
        consentement_rgpd: true
      })
      .select()
      .single();

    if (clientError) {
      console.error('❌ Erreur création client:', clientError.message);
      process.exit(1);
    }

    console.log(`✅ Client créé: ${client.prenom} ${client.nom}`);
    console.log('');

    // Générer un code d'accès
    const accessCode = 'TEST' + Math.random().toString(36).substring(2, 4).toUpperCase();

    // Créer l'invitation
    console.log('📧 Création de l\'invitation...');
    const { error: inviteError } = await supabase
      .from('client_invitations')
      .insert({
        client_id: client.id,
        cabinet_id: cabinet.id,
        email: client.email,
        access_code: accessCode,
        status: 'pending'
      });

    if (inviteError) {
      console.error('❌ Erreur création invitation:', inviteError.message);
      process.exit(1);
    }

    // Lier au cabinet
    console.log('🔗 Liaison au cabinet...');
    const { error: linkError } = await supabase
      .from('cabinet_clients')
      .insert({
        cabinet_id: cabinet.id,
        client_id: client.id
      });

    if (linkError) {
      console.error('❌ Erreur liaison cabinet:', linkError.message);
      process.exit(1);
    }

    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('✅ CLIENT DE TEST CRÉÉ AVEC SUCCÈS!');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('📋 INFORMATIONS DE CONNEXION:');
    console.log('');
    console.log(`   Email:        ${client.email}`);
    console.log(`   Code d'accès: ${accessCode}`);
    console.log('');
    console.log('🔐 ÉTAPES POUR SE CONNECTER:');
    console.log('');
    console.log('1. Allez sur: https://votre-site.com/client-login');
    console.log('2. Cliquez sur "Créer mon compte"');
    console.log(`3. Entrez le code: ${accessCode}`);
    console.log(`4. Entrez l'email: ${client.email}`);
    console.log('5. Créez un mot de passe (min. 8 caractères)');
    console.log('');
    console.log('📊 DÉTAILS TECHNIQUES:');
    console.log('');
    console.log(`   ID Client:  ${client.id}`);
    console.log(`   ID Cabinet: ${cabinet.id}`);
    console.log(`   Cabinet:    ${cabinet.nom}`);
    console.log('');
    console.log('═══════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    process.exit(1);
  }
}

createTestClient();
