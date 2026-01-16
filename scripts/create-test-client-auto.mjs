#!/usr/bin/env node

/**
 * Script pour créer un client de test automatiquement
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement depuis .env
dotenv.config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Erreur: Variables d\'environnement manquantes dans .env');
  console.error('Vérifiez que VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définis');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createTestClient() {
  try {
    console.log('🔍 Recherche de votre cabinet...\n');
    
    // Essayer d'abord avocat, puis notaire
    let cabinet = null;
    let role = 'avocat';
    
    const { data: avocatCabinet } = await supabase
      .from('cabinets')
      .select('id, owner_id, nom, role')
      .eq('role', 'avocat')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (avocatCabinet) {
      cabinet = avocatCabinet;
      role = 'avocat';
    } else {
      const { data: notaireCabinet } = await supabase
        .from('cabinets')
        .select('id, owner_id, nom, role')
        .eq('role', 'notaire')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (notaireCabinet) {
        cabinet = notaireCabinet;
        role = 'notaire';
      }
    }

    if (!cabinet) {
      console.error('❌ Aucun cabinet trouvé (ni avocat ni notaire).');
      console.error('Créez d\'abord un compte professionnel et un cabinet.\n');
      process.exit(1);
    }

    console.log(`✅ Cabinet trouvé: ${cabinet.nom} (${role})\n`);

    // Générer un code d'accès aléatoire
    const accessCode = 'TEST' + Math.random().toString(36).substring(2, 4).toUpperCase();
    const email = `test.client.${Date.now()}@neira.fr`;

    console.log('👤 Création du client de test...');
    
    // Créer le client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        owner_id: cabinet.owner_id,
        role: role,
        nom: 'Martin',
        prenom: 'Sophie',
        email: email,
        telephone: '06 12 34 56 78',
        adresse: '456 Avenue de Test, 75002 Paris',
        date_naissance: '1985-03-20',
        sexe: 'F',
        kyc_status: 'Valide',
        source: 'manual',
        consentement_rgpd: true
      })
      .select()
      .single();

    if (clientError) {
      console.error('❌ Erreur lors de la création du client:', clientError.message);
      process.exit(1);
    }

    console.log(`✅ Client créé: ${client.prenom} ${client.nom}\n`);

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
      console.error('❌ Erreur lors de la création de l\'invitation:', inviteError.message);
      process.exit(1);
    }

    console.log('✅ Invitation créée\n');

    // Lier au cabinet
    console.log('🔗 Liaison au cabinet...');
    const { error: linkError } = await supabase
      .from('cabinet_clients')
      .insert({
        cabinet_id: cabinet.id,
        client_id: client.id
      });

    if (linkError) {
      console.error('❌ Erreur lors de la liaison au cabinet:', linkError.message);
      process.exit(1);
    }

    console.log('✅ Client lié au cabinet\n');
    console.log('═══════════════════════════════════════════════');
    console.log('✅ CLIENT DE TEST CRÉÉ AVEC SUCCÈS!');
    console.log('═══════════════════════════════════════════════\n');
    console.log('📋 INFORMATIONS DE CONNEXION:\n');
    console.log(`   📧 Email:        ${client.email}`);
    console.log(`   🔑 Code d'accès: ${accessCode}`);
    console.log(`   👤 Nom complet:  ${client.prenom} ${client.nom}\n`);
    console.log('🔐 ÉTAPES POUR SE CONNECTER:\n');
    console.log('1. Allez sur: /client-login');
    console.log('2. Cliquez sur "Créer mon compte"');
    console.log(`3. Entrez le code: ${accessCode}`);
    console.log(`4. Entrez l'email: ${client.email}`);
    console.log('5. Créez un mot de passe (min. 8 caractères)');
    console.log('6. Le compte sera créé et vous serez connecté!\n');
    console.log('📊 DÉTAILS TECHNIQUES:\n');
    console.log(`   ID Client:  ${client.id}`);
    console.log(`   ID Cabinet: ${cabinet.id}`);
    console.log(`   Cabinet:    ${cabinet.nom}\n`);
    console.log('═══════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createTestClient();
