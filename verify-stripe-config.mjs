#!/usr/bin/env node

/**
 * Script de vérification de la configuration Stripe
 */

import Stripe from 'stripe';
import { config } from 'dotenv';

// Charger les variables d'environnement
config();

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  console.error('❌ STRIPE_SECRET_KEY non définie');
  console.log('\n💡 Pour vérifier votre configuration Stripe:');
  console.log('   STRIPE_SECRET_KEY=sk_live_... node verify-stripe-config.mjs\n');
  process.exit(1);
}

const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-11-20.acacia'
});

async function verifyConfig() {
  try {
    console.log('🔍 Vérification de la configuration Stripe...\n');

    // 1. Vérifier les produits
    console.log('📦 Produits configurés:');
    const products = await stripe.products.list({ limit: 10 });
    
    for (const product of products.data) {
      if (product.name.includes('NEIRA')) {
        console.log(`   ✅ ${product.name} (${product.id})`);
        
        // Lister les prix pour ce produit
        const prices = await stripe.prices.list({ product: product.id });
        for (const price of prices.data) {
          const amount = (price.unit_amount / 100).toFixed(2);
          const interval = price.recurring?.interval || 'one-time';
          console.log(`      💰 ${amount}€/${interval} (${price.id})`);
        }
      }
    }

    // 2. Vérifier la configuration du portail
    console.log('\n🔧 Configuration du portail client:');
    const portalConfigs = await stripe.billingPortal.configurations.list({ limit: 1 });
    
    if (portalConfigs.data.length > 0) {
      const config = portalConfigs.data[0];
      console.log(`   ID: ${config.id}`);
      console.log(`   Annulation abonnement: ${config.features.subscription_cancel.enabled ? '❌ ACTIVÉE (à désactiver!)' : '✅ DÉSACTIVÉE'}`);
      console.log(`   Modification abonnement: ${config.features.subscription_update?.enabled ? '⚠️  ACTIVÉE' : '✅ DÉSACTIVÉE'}`);
      console.log(`   Mise à jour paiement: ${config.features.payment_method_update.enabled ? '✅ ACTIVÉE' : '❌ DÉSACTIVÉE'}`);
    } else {
      console.log('   ⚠️  Aucune configuration trouvée');
    }

    // 3. Vérifier un abonnement actif (exemple)
    console.log('\n💳 Abonnements actifs récents:');
    const subscriptions = await stripe.subscriptions.list({ 
      limit: 3,
      status: 'active'
    });
    
    if (subscriptions.data.length > 0) {
      for (const sub of subscriptions.data) {
        const cancelAt = sub.cancel_at 
          ? new Date(sub.cancel_at * 1000).toLocaleDateString('fr-FR')
          : 'Aucune';
        
        console.log(`\n   📋 Subscription ${sub.id.substring(0, 20)}...`);
        console.log(`      Status: ${sub.status}`);
        console.log(`      Période: ${sub.items.data[0]?.price.recurring?.interval || 'N/A'}`);
        console.log(`      Quantité: ${sub.items.data[0]?.quantity || 1}`);
        console.log(`      🔒 Annulation programmée: ${cancelAt}`);
        
        if (sub.cancel_at) {
          const monthsUntilCancel = Math.round((sub.cancel_at * 1000 - Date.now()) / (1000 * 60 * 60 * 24 * 30));
          console.log(`      📅 Engagement restant: ~${monthsUntilCancel} mois`);
        }
      }
    } else {
      console.log('   ℹ️  Aucun abonnement actif trouvé');
    }

    console.log('\n✅ Vérification terminée!\n');

    // Résumé de la configuration attendue
    console.log('📋 Configuration attendue pour l\'engagement 12 mois:');
    console.log('   • Abonnements mensuels avec cancel_at à +12 mois ✓');
    console.log('   • Portail client: annulation désactivée ✓');
    console.log('   • Paiement mensuel à la date anniversaire (15 jan → 15 fév) ✓');
    console.log('   • Option annuelle avec -10% disponible ✓\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

verifyConfig();
