#!/usr/bin/env node

/**
 * Configure le portail client Stripe pour afficher les prochaines factures
 */

import Stripe from 'stripe';

// Récupérer la clé API depuis les variables d'environnement
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error('❌ STRIPE_SECRET_KEY non définie');
  console.log('Usage: STRIPE_SECRET_KEY=sk_live_... node configure-stripe-portal.mjs');
  process.exit(1);
}

const stripe = new Stripe(stripeKey, {
  apiVersion: '2023-10-16',
});

async function configurePortal() {
  console.log('🔧 Configuration du portail client Stripe...\n');

  try {
    // Lister tous les produits et leurs prix (uniquement les 3 abonnements)
    const products = await stripe.products.list({ limit: 100 });
    const subscriptionProducts = products.data.filter(p => 
      p.name.includes('Essentiel') || 
      p.name.includes('Professionnel') || 
      p.name.includes('Cabinet+')
    );
    
    const productsWithPrices = [];
    
    for (const product of subscriptionProducts) {
      const prices = await stripe.prices.list({ product: product.id, limit: 100 });
      if (prices.data.length > 0) {
        productsWithPrices.push({
          product: product.id,
          prices: prices.data.map(p => p.id),
        });
      }
    }
    
    console.log(`📦 ${productsWithPrices.length} produits d'abonnement trouvés\n`);

    // Récupérer la configuration actuelle
    const configurations = await stripe.billingPortal.configurations.list({ limit: 1 });
    
    let config;
    if (configurations.data.length > 0) {
      // Mettre à jour la configuration existante
      config = await stripe.billingPortal.configurations.update(
        configurations.data[0].id,
        {
          features: {
            invoice_history: {
              enabled: true,
            },
            payment_method_update: {
              enabled: true,
            },
            subscription_cancel: {
              enabled: true,
              mode: 'at_period_end',
            },
            subscription_update: {
              enabled: true,
              default_allowed_updates: ['price', 'quantity'],
              proration_behavior: 'always_invoice',
              products: productsWithPrices,
            },
          },
          business_profile: {
            headline: 'Gérez votre abonnement Neira',
          },
        }
      );
      console.log('✅ Configuration du portail mise à jour');
    } else {
      // Créer une nouvelle configuration
      config = await stripe.billingPortal.configurations.create({
        features: {
          invoice_history: {
            enabled: true,
          },
          payment_method_update: {
            enabled: true,
          },
          subscription_cancel: {
            enabled: true,
            mode: 'at_period_end',
          },
          subscription_update: {
            enabled: true,
            default_allowed_updates: ['price', 'quantity'],
            proration_behavior: 'always_invoice',
            products: productsWithPrices,
          },
        },
        business_profile: {
          headline: 'Gérez votre abonnement Neira',
        },
      });
      console.log('✅ Configuration du portail créée');
    }

    console.log('\n📋 Configuration active:');
    console.log('- ID:', config.id);
    console.log('- Historique de facturation:', config.features.invoice_history.enabled ? '✅' : '❌');
    console.log('- Mise à jour moyen de paiement:', config.features.payment_method_update.enabled ? '✅' : '❌');
    console.log('- Annulation abonnement:', config.features.subscription_cancel.enabled ? '✅' : '❌');
    console.log('- Modification abonnement:', config.features.subscription_update.enabled ? '✅' : '❌');
    
    console.log('\n✨ Le portail client affichera maintenant:');
    console.log('  • Historique complet des factures');
    console.log('  • Prochaine facture à venir');
    console.log('  • Gestion du moyen de paiement');
    console.log('  • Modification de l\'abonnement');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

configurePortal();
