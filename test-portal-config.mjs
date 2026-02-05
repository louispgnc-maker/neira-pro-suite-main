#!/usr/bin/env node

/**
 * Script pour vérifier la configuration du portail client Stripe
 * et créer une session de portail de test
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia'
});

async function testPortalConfig() {
  try {
    console.log('🔍 Vérification de la configuration du portail...\n');

    // Récupérer la configuration du portail
    const configurations = await stripe.billingPortal.configurations.list({ limit: 1 });
    
    if (configurations.data.length === 0) {
      console.log('❌ Aucune configuration de portail trouvée');
      return;
    }

    const config = configurations.data[0];

    console.log('📋 Configuration actuelle du portail Stripe :');
    console.log('─'.repeat(50));
    console.log(`ID: ${config.id}`);
    console.log(`\n🎯 Fonctionnalités :`);
    console.log(`  • Annulation d'abonnement : ${config.features.subscription_cancel.enabled ? '✅ ACTIVÉE' : '❌ DÉSACTIVÉE'}`);
    console.log(`  • Changement de plan : ${config.features.subscription_update.enabled ? '✅ ACTIVÉE' : '❌ DÉSACTIVÉE'}`);
    console.log(`  • Mise à jour paiement : ${config.features.payment_method_update.enabled ? '✅ ACTIVÉE' : '❌ DÉSACTIVÉE'}`);
    console.log(`  • Historique factures : ${config.features.invoice_history.enabled ? '✅ ACTIVÉE' : '❌ DÉSACTIVÉE'}`);
    console.log(`  • Mise à jour infos client : ${config.features.customer_update.enabled ? '✅ ACTIVÉE' : '❌ DÉSACTIVÉE'}`);
    
    console.log('\n─'.repeat(50));
    
    if (!config.features.subscription_cancel.enabled && !config.features.subscription_update.enabled) {
      console.log('\n✅ PARFAIT ! Les annulations et changements de plan sont bloqués.');
      console.log('   → L\'engagement de 12 mois est garanti\n');
    } else {
      console.log('\n⚠️  ATTENTION ! Les clients peuvent encore :');
      if (config.features.subscription_cancel.enabled) {
        console.log('   - Annuler leur abonnement ❌');
      }
      if (config.features.subscription_update.enabled) {
        console.log('   - Changer de plan ❌');
      }
      console.log('\nRelance le script configure-stripe-portal-no-cancel.mjs\n');
    }

    // Créer une session de test pour un client existant
    console.log('💡 Pour tester le portail avec un vrai client :');
    console.log('   1. Créer un abonnement test sur https://dashboard.stripe.com/subscriptions');
    console.log('   2. Copier le Customer ID (cus_...)');
    console.log('   3. Exécuter : CUSTOMER_ID="cus_..." node test-portal-config.mjs --create-session\n');

    // Si un customer_id est fourni, créer une session de portail
    if (process.argv.includes('--create-session') && process.env.CUSTOMER_ID) {
      console.log('\n🔗 Création d\'une session de portail...');
      const session = await stripe.billingPortal.sessions.create({
        customer: process.env.CUSTOMER_ID,
        return_url: 'https://neira.fr',
      });
      console.log(`\n✅ Session créée avec succès !`);
      console.log(`\n🌐 Ouvre ce lien pour tester le portail :`);
      console.log(`   ${session.url}\n`);
      console.log('   → Vérifie qu\'il n\'y a PAS de bouton "Annuler l\'abonnement"\n');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testPortalConfig();
