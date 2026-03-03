#!/usr/bin/env node

/**
 * Script de diagnostic pour tester l'API Universign
 * Ce script aide à identifier les problèmes de configuration et d'authentification
 */

import 'dotenv/config';

const UNIVERSIGN_API_URL = process.env.UNIVERSIGN_API_URL || 'https://ws.universign.eu/tsa/v1';
const UNIVERSIGN_USERNAME = process.env.UNIVERSIGN_USERNAME;
const UNIVERSIGN_PASSWORD = process.env.UNIVERSIGN_PASSWORD;
const UNIVERSIGN_API_KEY = process.env.UNIVERSIGN_API_KEY;

console.log('🔍 Diagnostic de l\'API Universign\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Vérification de la configuration
console.log('📋 Configuration détectée:');
console.log(`   API URL: ${UNIVERSIGN_API_URL}`);
console.log(`   Username: ${UNIVERSIGN_USERNAME ? '✓ Configuré' : '✗ Manquant'}`);
console.log(`   Password: ${UNIVERSIGN_PASSWORD ? '✓ Configuré' : '✗ Manquant'}`);
console.log(`   API Key: ${UNIVERSIGN_API_KEY ? '✓ Configuré' : '✗ Manquant'}`);

if (!UNIVERSIGN_API_KEY && (!UNIVERSIGN_USERNAME || !UNIVERSIGN_PASSWORD)) {
  console.log('\n❌ Erreur: Aucune méthode d\'authentification configurée');
  console.log('\n💡 Solutions:');
  console.log('   1. Configuration avec API Key (recommandé):');
  console.log('      export UNIVERSIGN_API_KEY=votre_api_key');
  console.log('      supabase secrets set UNIVERSIGN_API_KEY=votre_api_key');
  console.log('\n   2. Configuration avec Username/Password:');
  console.log('      export UNIVERSIGN_USERNAME=votre_username');
  console.log('      export UNIVERSIGN_PASSWORD=votre_password');
  console.log('      supabase secrets set UNIVERSIGN_USERNAME=votre_username');
  console.log('      supabase secrets set UNIVERSIGN_PASSWORD=votre_password');
  process.exit(1);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test de connexion à l'API
async function testAPI() {
  console.log('🔌 Test de connexion à l\'API Universign...\n');

  const headers = {
    'Content-Type': 'application/json'
  };

  if (UNIVERSIGN_API_KEY) {
    headers['Authorization'] = `Bearer ${UNIVERSIGN_API_KEY}`;
    console.log('   Méthode: API Key (Bearer token)');
  } else {
    const credentials = Buffer.from(`${UNIVERSIGN_USERNAME}:${UNIVERSIGN_PASSWORD}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
    console.log('   Méthode: Basic Auth (username:password)');
  }

  console.log(`   Endpoint: ${UNIVERSIGN_API_URL}/requester/requestTransaction`);

  // Test avec une requête minimale
  const testRequest = {
    profile: 'simple',
    customId: `test_${Date.now()}`,
    signers: [{
      firstname: 'Test',
      lastname: 'User',
      emailAddress: 'test@example.com'
    }],
    documents: [{
      name: 'test.pdf',
      content: 'https://example.com/test.pdf'
    }],
    language: 'fr'
  };

  console.log('\n📤 Envoi d\'une requête de test...');

  try {
    const response = await fetch(`${UNIVERSIGN_API_URL}/requester/requestTransaction`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testRequest)
    });

    console.log(`\n📥 Réponse reçue:`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    
    if (response.ok) {
      console.log('\n✅ Succès! L\'API fonctionne correctement');
      try {
        const data = JSON.parse(responseText);
        console.log('\n📄 Données de la réponse:');
        console.log(JSON.stringify(data, null, 2));
      } catch {
        console.log('\n📄 Réponse (texte brut):');
        console.log(responseText);
      }
    } else {
      console.log('\n❌ Erreur de l\'API');
      console.log('\n📄 Détails de l\'erreur:');
      console.log(responseText);
      
      if (response.status === 401 || response.status === 403) {
        console.log('\n💡 Problème d\'authentification détecté:');
        console.log('   - Vérifiez que vos identifiants sont corrects');
        console.log('   - Vérifiez que votre compte Universign est actif');
        console.log('   - Vérifiez que vous utilisez la bonne URL (production vs test)');
      } else if (response.status === 400) {
        console.log('\n💡 Problème de format de requête:');
        console.log('   - Le format de la requête n\'est pas accepté par l\'API');
        console.log('   - Vérifiez la documentation Universign pour votre version d\'API');
      } else if (response.status === 500) {
        console.log('\n💡 Erreur serveur Universign:');
        console.log('   - Le serveur Universign a rencontré une erreur');
        console.log('   - Vérifiez que l\'URL du document est accessible');
        console.log('   - Contactez le support Universign si le problème persiste');
      }
    }
  } catch (error) {
    console.log('\n❌ Erreur de connexion:', error.message);
    console.log('\n💡 Vérifications:');
    console.log('   - Vérifiez votre connexion internet');
    console.log('   - Vérifiez que l\'URL de l\'API est correcte');
    console.log('   - Vérifiez qu\'il n\'y a pas de proxy/firewall bloquant');
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

testAPI().then(() => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✨ Test terminé\n');
}).catch(error => {
  console.error('\n❌ Erreur inattendue:', error);
  process.exit(1);
});
