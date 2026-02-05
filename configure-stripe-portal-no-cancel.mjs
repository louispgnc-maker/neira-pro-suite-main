#!/usr/bin/env node

/**
 * Script pour configurer le portail client Stripe
 * Désactive les annulations d'abonnement pour respecter l'engagement de 12 mois
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia'
});

async function configurePortal() {
  try {
    console.log('🔧 Configuration du portail client Stripe...\n');

    // Récupérer la configuration actuelle du portail
    const configurations = await stripe.billingPortal.configurations.list({ limit: 1 });
    
    let config;
    if (configurations.data.length > 0) {
      // Mettre à jour la configuration existante
      config = await stripe.billingPortal.configurations.update(
        configurations.data[0].id,
        {
          business_profile: {
            headline: 'Gérez votre abonnement Neira',
          },
          features: {
            customer_update: {
              enabled: true,
              allowed_updates: ['email', 'address', 'phone', 'tax_id'],
            },
            invoice_history: {
              enabled: true,
            },
            payment_method_update: {
              enabled: true,
            },
            subscription_cancel: {
              enabled: false, // ❌ DÉSACTIVER LES ANNULATIONS
            },
            subscription_update: {
              enabled: false, // ❌ DÉSACTIVER LES CHANGEMENTS DE PLAN (géré par l'app)
              default_allowed_updates: [],
            },
          },
        }
      );
      console.log('✅ Configuration du portail mise à jour');
    } else {
      // Créer une nouvelle configuration
      config = await stripe.billingPortal.configurations.create({
        business_profile: {
          headline: 'Gérez votre abonnement Neira',
        },
        features: {
          customer_update: {
            enabled: true,
            allowed_updates: ['email', 'address', 'phone', 'tax_id'],
          },
          invoice_history: {
            enabled: true,
          },
          payment_method_update: {
            enabled: true,
          },
          subscription_cancel: {
            enabled: false, // ❌ DÉSACTIVER LES ANNULATIONS
          },
          subscription_update: {
            enabled: false, // ❌ DÉSACTIVER LES CHANGEMENTS DE PLAN (géré par l'app)
            default_allowed_updates: [],
          },
        },
      });
      console.log('✅ Nouvelle configuration du portail créée');
    }

    console.log('\n📋 Résumé de la configuration :');
    console.log('  - Annulation : DÉSACTIVÉE ❌');
    console.log('  - Changement de plan : DÉSACTIVÉ ❌');
    console.log('  - Mise à jour paiement : ACTIVÉE ✅');
    console.log('  - Historique factures : ACTIVÉ ✅');
    console.log('  - Mise à jour infos client : ACTIVÉE ✅');
    console.log('\n✨ Les clients ne peuvent plus annuler leur abonnement via le portail Stripe');
    console.log('   → Engagement de 12 mois respecté');
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration du portail:', error.message);
    process.exit(1);
  }
}

configurePortal();
