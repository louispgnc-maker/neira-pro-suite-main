import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { 
  apiVersion: '2024-11-20.acacia' 
});

const email = 'louis.poignonec@essca.eu';

console.log(`🔍 Recherche des subscriptions pour ${email}...\n`);

const customers = await stripe.customers.list({ email });

if (customers.data.length === 0) {
  console.log('❌ Aucun customer Stripe trouvé');
  process.exit(0);
}

for (const customer of customers.data) {
  console.log(`✅ Customer: ${customer.id}`);
  const subs = await stripe.subscriptions.list({ 
    customer: customer.id, 
    status: 'all',
    limit: 10
  });
  
  if (subs.data.length === 0) {
    console.log('   Aucune subscription\n');
    continue;
  }
  
  for (const sub of subs.data) {
    console.log(`   📋 Subscription: ${sub.id}`);
    console.log(`      Status: ${sub.status}`);
    console.log(`      Created: ${new Date(sub.created * 1000).toISOString()}\n`);
  }
}
