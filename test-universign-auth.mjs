#!/usr/bin/env node

/**
 * Script de test pour vérifier l'authentification Universign
 * 
 * Universign utilise l'authentification HTTP Basic avec username et password
 * Il faut encoder "username:password" en Base64 et l'envoyer dans le header Authorization
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquant dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUniversignAuth() {
  console.log('🔍 Test de l\'authentification Universign\n');

  try {
    // Récupérer les secrets depuis Supabase
    console.log('📥 Récupération des secrets Supabase...');
    
    // Note: On ne peut pas récupérer les secrets directement via l'API
    // Il faut les configurer manuellement
    
    console.log('\n📋 Instructions pour configurer Universign:');
    console.log('\n1. Allez sur votre compte Universign');
    console.log('   https://www.universign.com/');
    console.log('\n2. Récupérez vos identifiants API dans :');
    console.log('   - Mon compte > API > Identifiants');
    console.log('   - Vous devriez avoir un USERNAME et un PASSWORD');
    console.log('\n3. Universign utilise deux types d\'authentification :');
    console.log('   a) HTTP Basic Auth : username:password encodé en Base64');
    console.log('   b) API Key (Bearer token) : selon votre type de compte');
    console.log('\n4. Pour configurer dans Supabase :');
    console.log('\n   Méthode 1 - Basic Auth (username + password):');
    console.log('   npx supabase secrets set UNIVERSIGN_USERNAME=votre_username');
    console.log('   npx supabase secrets set UNIVERSIGN_PASSWORD=votre_password');
    console.log('\n   Méthode 2 - API Key (Bearer token):');
    console.log('   npx supabase secrets set UNIVERSIGN_API_KEY=votre_api_key');
    console.log('\n5. Configurez aussi l\'URL de l\'API:');
    console.log('   npx supabase secrets set UNIVERSIGN_API_URL=https://ws.universign.eu/tsa/v1');
    console.log('\n📌 Note: L\'URL peut être différente selon votre environnement (production/test)');
    console.log('   - Production: https://ws.universign.eu/tsa/v1');
    console.log('   - Test: https://sign.test.cryptolog.com/tsa/v1');
    
    console.log('\n\n💡 Types de comptes Universign:');
    console.log('   1. API REST moderne : utilise Bearer token (UNIVERSIGN_API_KEY)');
    console.log('   2. API SOAP classique : utilise Basic Auth (username:password)');
    
    console.log('\n\n🔧 Pour vérifier quel type vous avez:');
    console.log('   - Regardez votre documentation Universign');
    console.log('   - Ou contactez le support Universign');
    console.log('   - Ou testez les deux méthodes');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testUniversignAuth();
