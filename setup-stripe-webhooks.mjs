#!/usr/bin/env node

/**
 * Configuration complète Stripe + Supabase en mode LIVE
 */

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const SUPABASE_PROJECT_URL = 'https://elysrdqujzlbvnjfilvh.supabase.co';

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY manquante');
  console.error('Usage: STRIPE_SECRET_KEY=sk_live_... node setup-stripe-webhooks.mjs');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

console.log('🔧 Configuration des webhooks Stripe en mode LIVE...\n');

// URL des Edge Functions
const WEBHOOK_SUBSCRIPTIONS_URL = `${SUPABASE_PROJECT_URL}/functions/v1/stripe-webhook-subscriptions`;
const WEBHOOK_SIGNATURES_URL = `${SUPABASE_PROJECT_URL}/functions/v1/stripe-webhook-signatures`;

try {
  // 1. Créer le webhook pour les abonnements
  console.log('📡 Création du webhook Abonnements...');
  const webhookSubscriptions = await stripe.webhookEndpoints.create({
    url: WEBHOOK_SUBSCRIPTIONS_URL,
    enabled_events: [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
    ],
    description: 'Webhook pour les abonnements Neira',
  });

  console.log('✅ Webhook Abonnements créé !');
  console.log(`   ID: ${webhookSubscriptions.id}`);
  console.log(`   Secret: ${webhookSubscriptions.secret}`);
  console.log();

  // 2. Créer le webhook pour les signatures
  console.log('📡 Création du webhook Signatures...');
  const webhookSignatures = await stripe.webhookEndpoints.create({
    url: WEBHOOK_SIGNATURES_URL,
    enabled_events: [
      'checkout.session.completed',
      'payment_intent.succeeded',
    ],
    description: 'Webhook pour les packs de signatures Neira',
  });

  console.log('✅ Webhook Signatures créé !');
  console.log(`   ID: ${webhookSignatures.id}`);
  console.log(`   Secret: ${webhookSignatures.secret}`);
  console.log();

  // 3. Afficher le résumé
  console.log('=' .repeat(70));
  console.log('✅ WEBHOOKS CRÉÉS AVEC SUCCÈS !');
  console.log('=' .repeat(70));
  console.log();
  console.log('📋 Variables à ajouter dans Supabase Edge Functions :');
  console.log();
  console.log('STRIPE_SECRET_KEY');
  console.log(STRIPE_SECRET_KEY);
  console.log();
  console.log('STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS');
  console.log(webhookSubscriptions.secret);
  console.log();
  console.log('STRIPE_WEBHOOK_SECRET_SIGNATURES');
  console.log(webhookSignatures.secret);
  console.log();
  console.log('⚠️  Copie ces valeurs et ajoute-les dans :');
  console.log('Supabase Dashboard → Project Settings → Edge Functions → Environment variables');
  console.log();

} catch (error) {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
}
