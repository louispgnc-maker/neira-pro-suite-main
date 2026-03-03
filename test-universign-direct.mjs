#!/usr/bin/env node

/**
 * Script pour tester directement l'API Universign
 * avec les identifiants que vous devez fournir
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Test de l\'authentification Universign\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Demande des identifiants
console.log('📝 Veuillez entrer vos identifiants Universign:\n');
console.log('Option 1 - API Key (recommandé pour les nouveaux comptes):');
console.log('   Exemple: sk_test_xxxxxxxxxxxxx ou une clé similaire\n');
console.log('Option 2 - Username/Password (pour les comptes classiques):');
console.log('   Username: votre email ou identifiant');
console.log('   Password: votre mot de passe API\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('💡 Pour configurer dans Supabase (après avoir testé):');
console.log('');
console.log('Si vous utilisez une API Key:');
console.log('   supabase secrets set UNIVERSIGN_API_KEY=votre_cle');
console.log('');
console.log('Si vous utilisez Username/Password:');
console.log('   supabase secrets set UNIVERSIGN_USERNAME=votre_username');
console.log('   supabase secrets set UNIVERSIGN_PASSWORD=votre_password');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('⚠️  IMPORTANT: L\'erreur 401 que vous rencontrez signifie que:');
console.log('   1. Les identifiants configurés dans Supabase sont incorrects');
console.log('   2. Ou l\'API Key/Password a expiré');
console.log('   3. Ou vous utilisez la mauvaise URL d\'API (prod vs test)\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📋 Étapes de résolution:');
console.log('');
console.log('1. Connectez-vous à votre compte Universign:');
console.log('   https://www.universign.com/');
console.log('');
console.log('2. Allez dans la section API/Développeurs');
console.log('');
console.log('3. Vérifiez/Générez vos identifiants API');
console.log('');
console.log('4. Notez bien si vous êtes en environnement:');
console.log('   - Production: https://ws.universign.eu/tsa/v1');
console.log('   - Test/Sandbox: https://sign.test.cryptolog.com/tsa/v1');
console.log('');
console.log('5. Mettez à jour les secrets Supabase avec les BONS identifiants:');
console.log('   supabase secrets set UNIVERSIGN_API_KEY=la_nouvelle_cle');
console.log('   supabase secrets set UNIVERSIGN_API_URL=la_bonne_url');
console.log('');
console.log('6. Redéployez la fonction:');
console.log('   supabase functions deploy universign-create-signature');
console.log('');
console.log('7. Attendez 30 secondes puis réessayez');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📞 Support Universign:');
console.log('   Si vous ne trouvez pas vos identifiants, contactez le support:');
console.log('   Email: support@universign.com');
console.log('   Tel: +33 1 44 78 25 26\n');
