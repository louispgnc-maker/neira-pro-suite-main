import Stripe from 'stripe';

const stripeKey = process.argv[2] || process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  console.error('❌ STRIPE_SECRET_KEY manquante');
  console.error('Usage: node sync-stripe-subscriptions-check.mjs sk_live_...');
  process.exit(1);
}

const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });

console.log('🔍 Recherche des subscriptions Stripe...\n');

async function listSubscriptions() {
  try {
    // Lister toutes les subscriptions actives
    const subscriptions = await stripe.subscriptions.list({
      status: 'all',
      limit: 100,
    });

    console.log(`📊 ${subscriptions.data.length} subscriptions trouvées\n`);

    const results = [];

    for (const sub of subscriptions.data) {
      const customer = await stripe.customers.retrieve(sub.customer);
      
      results.push({
        subscription_id: sub.id,
        customer_id: sub.customer,
        customer_email: customer.email || 'N/A',
        status: sub.status,
        plan: sub.items.data[0]?.price.nickname || 'N/A',
        created: new Date(sub.created * 1000).toISOString(),
      });
    }

    console.log('📋 Subscriptions Stripe:');
    console.table(results);

    console.log('\n💡 Copier ces subscription_ids pour les mettre dans Supabase manuellement');
    console.log('   ou les utiliser pour mettre à jour les cabinets correspondants.\n');

    // Générer les commandes SQL
    console.log('📝 Commandes SQL à exécuter dans Supabase:\n');
    for (const r of results) {
      if (r.customer_email !== 'N/A' && (r.status === 'active' || r.status === 'trialing')) {
        console.log(`-- Pour ${r.customer_email}`);
        console.log(`UPDATE cabinets 
SET 
  stripe_subscription_id = '${r.subscription_id}',
  stripe_customer_id = '${r.customer_id}',
  subscription_status = '${r.status}'
WHERE owner_id IN (
  SELECT id FROM auth.users WHERE email = '${r.customer_email}'
);\n`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

listSubscriptions();
