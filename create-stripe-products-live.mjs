#!/usr/bin/env node

/**
 * Script pour créer les produits et prix Stripe en mode LIVE
 * 
 * Prérequis :
 * 1. Compte Stripe activé en production
 * 2. Clé secrète LIVE (sk_live_...)
 * 
 * Usage :
 * STRIPE_SECRET_KEY=sk_live_... node create-stripe-products-live.mjs
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

console.log('🚀 Création des produits Stripe en mode LIVE...\n');

// Vérifier qu'on est en mode LIVE
if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) {
  console.error('❌ ERREUR: Vous devez utiliser une clé LIVE (sk_live_...)');
  console.error('Usage: STRIPE_SECRET_KEY=sk_live_... node create-stripe-products-live.mjs');
  process.exit(1);
}

const products = [];

// ============================================
// 1. FORMULES D'ABONNEMENT
// ============================================

console.log('📦 Création des formules d\'abonnement...\n');

// ESSENTIEL
const essentiel = await stripe.products.create({
  name: 'NEIRA Essentiel',
  description: '1 utilisateur • 20 Go • 100 dossiers • 30 clients • 15 signatures/mois',
  metadata: {
    tier: 'essentiel',
    users: '1',
    storage: '20',
    folders: '100',
    clients: '30',
    signatures: '15'
  }
});

const essentielMonthly = await stripe.prices.create({
  product: essentiel.id,
  currency: 'eur',
  unit_amount: 4500, // 45€
  recurring: {
    interval: 'month',
  },
  metadata: {
    tier: 'essentiel',
    period: 'monthly'
  }
});

const essentielYearly = await stripe.prices.create({
  product: essentiel.id,
  currency: 'eur',
  unit_amount: 48600, // 486€ (45 × 12 × 0.9)
  recurring: {
    interval: 'year',
  },
  metadata: {
    tier: 'essentiel',
    period: 'yearly'
  }
});

products.push({
  name: 'NEIRA Essentiel',
  monthly: essentielMonthly.id,
  yearly: essentielYearly.id
});

console.log('✅ NEIRA Essentiel créé');
console.log(`   Mensuel: ${essentielMonthly.id} (45€/mois)`);
console.log(`   Annuel:  ${essentielYearly.id} (486€/an)\n`);

// PROFESSIONNEL
const professionnel = await stripe.products.create({
  name: 'NEIRA Professionnel',
  description: 'Jusqu\'à 10 utilisateurs • 100 Go • Dossiers & clients illimités • 40 signatures/mois par utilisateur',
  metadata: {
    tier: 'professionnel',
    users: '10',
    storage: '100',
    folders: 'unlimited',
    clients: 'unlimited',
    signatures: '40'
  }
});

const professionnelMonthly = await stripe.prices.create({
  product: professionnel.id,
  currency: 'eur',
  unit_amount: 6900, // 69€ par utilisateur
  recurring: {
    interval: 'month',
  },
  metadata: {
    tier: 'professionnel',
    period: 'monthly'
  }
});

const professionnelYearly = await stripe.prices.create({
  product: professionnel.id,
  currency: 'eur',
  unit_amount: 74520, // 745.20€ par utilisateur (69 × 12 × 0.9)
  recurring: {
    interval: 'year',
  },
  metadata: {
    tier: 'professionnel',
    period: 'yearly'
  }
});

products.push({
  name: 'NEIRA Professionnel',
  monthly: professionnelMonthly.id,
  yearly: professionnelYearly.id
});

console.log('✅ NEIRA Professionnel créé');
console.log(`   Mensuel: ${professionnelMonthly.id} (69€/mois/utilisateur)`);
console.log(`   Annuel:  ${professionnelYearly.id} (745€/an/utilisateur)\n`);

// CABINET+
const cabinetPlus = await stripe.products.create({
  name: 'NEIRA Cabinet+',
  description: 'Jusqu\'à 50 utilisateurs • Stockage illimité • Tout illimité • 100 signatures/mois par utilisateur',
  metadata: {
    tier: 'cabinet-plus',
    users: '50',
    storage: 'unlimited',
    folders: 'unlimited',
    clients: 'unlimited',
    signatures: '100'
  }
});

const cabinetPlusMonthly = await stripe.prices.create({
  product: cabinetPlus.id,
  currency: 'eur',
  unit_amount: 9900, // 99€ par utilisateur
  recurring: {
    interval: 'month',
  },
  metadata: {
    tier: 'cabinet-plus',
    period: 'monthly'
  }
});

const cabinetPlusYearly = await stripe.prices.create({
  product: cabinetPlus.id,
  currency: 'eur',
  unit_amount: 106920, // 1069.20€ par utilisateur (99 × 12 × 0.9)
  recurring: {
    interval: 'year',
  },
  metadata: {
    tier: 'cabinet-plus',
    period: 'yearly'
  }
});

products.push({
  name: 'NEIRA Cabinet+',
  monthly: cabinetPlusMonthly.id,
  yearly: cabinetPlusYearly.id
});

console.log('✅ NEIRA Cabinet+ créé');
console.log(`   Mensuel: ${cabinetPlusMonthly.id} (99€/mois/utilisateur)`);
console.log(`   Annuel:  ${cabinetPlusYearly.id} (1069€/an/utilisateur)\n`);

// ============================================
// 2. PACKS DE SIGNATURES
// ============================================

console.log('✍️  Création des packs de signatures...\n');

const signaturePacks = [
  { name: 'Pack Urgence', quantity: 1, price: 300, id: 'urgence' },
  { name: 'Pack Mini', quantity: 10, price: 2000, id: 'mini' },
  { name: 'Pack Starter', quantity: 25, price: 3000, id: 'starter' },
  { name: 'Pack Pro', quantity: 50, price: 4500, id: 'pro' },
  { name: 'Pack Business', quantity: 100, price: 7000, id: 'business' },
  { name: 'Pack Enterprise', quantity: 250, price: 14000, id: 'enterprise' },
];

const signaturePrices = {};

for (const pack of signaturePacks) {
  const product = await stripe.products.create({
    name: pack.name,
    description: `${pack.quantity} signature${pack.quantity > 1 ? 's' : ''} électronique${pack.quantity > 1 ? 's' : ''} YouSign`,
    metadata: {
      type: 'signature_pack',
      quantity: pack.quantity.toString(),
      pack_id: pack.id
    }
  });

  const price = await stripe.prices.create({
    product: product.id,
    currency: 'eur',
    unit_amount: pack.price,
    metadata: {
      pack_id: pack.id,
      quantity: pack.quantity.toString()
    }
  });

  signaturePrices[pack.id] = price.id;

  console.log(`✅ ${pack.name} créé`);
  console.log(`   Price ID: ${price.id} (${pack.price / 100}€ pour ${pack.quantity} signature${pack.quantity > 1 ? 's' : ''})`);
}

// ============================================
// 3. AFFICHAGE DU RÉSUMÉ
// ============================================

console.log('\n' + '='.repeat(60));
console.log('✅ TOUS LES PRODUITS ONT ÉTÉ CRÉÉS EN MODE LIVE !');
console.log('='.repeat(60) + '\n');

console.log('📋 Copier ces price IDs dans src/lib/stripeConfig.ts :\n');

console.log('export const STRIPE_PRICE_IDS = {');
console.log('  essentiel: {');
console.log(`    monthly: '${essentielMonthly.id}',`);
console.log(`    yearly: '${essentielYearly.id}'`);
console.log('  },');
console.log('  professionnel: {');
console.log(`    monthly: '${professionnelMonthly.id}',`);
console.log(`    yearly: '${professionnelYearly.id}'`);
console.log('  },');
console.log('  \'cabinet-plus\': {');
console.log(`    monthly: '${cabinetPlusMonthly.id}',`);
console.log(`    yearly: '${cabinetPlusYearly.id}'`);
console.log('  }');
console.log('} as const;\n');

console.log('export const SIGNATURE_PACK_PRICE_IDS = {');
console.log(`  urgence: '${signaturePrices.urgence}',`);
console.log(`  mini: '${signaturePrices.mini}',`);
console.log(`  starter: '${signaturePrices.starter}',`);
console.log(`  pro: '${signaturePrices.pro}',`);
console.log(`  business: '${signaturePrices.business}',`);
console.log(`  enterprise: '${signaturePrices.enterprise}'`);
console.log('} as const;\n');

console.log('⚠️  PROCHAINES ÉTAPES :');
console.log('1. Copier les price IDs ci-dessus dans src/lib/stripeConfig.ts');
console.log('2. Configurer les webhooks Stripe en mode LIVE');
console.log('3. Mettre à jour STRIPE_SECRET_KEY dans Supabase Edge Functions');
console.log('4. Tester avec une vraie carte bancaire');
console.log('5. git commit et git push\n');
