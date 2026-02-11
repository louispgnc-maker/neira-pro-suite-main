import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripeKey = process.env.STRIPE_SECRET_KEY;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeKey || !supabaseKey) {
  console.error('❌ Missing environment variables');
  console.error('Set STRIPE_SECRET_KEY and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-11-20.acacia',
});

const supabase = createClient(
  'https://elysrdqujzlbvnjfilvh.supabase.co',
  supabaseKey
);

const CABINET_ID = '85e7f59a-ac19-476d-8484-6e4988b9638d';
const PROFESSIONAL_SUB_ID = 'sub_1SzMka7epLIfQ2kH26WjZrBP';

async function syncStripeAndSupabase() {
  console.log('🔄 Starting sync for contact@neira.fr...\n');
  
  // ÉTAPE 1: Récupérer l'abonnement Professionnel depuis Stripe
  console.log('📥 Step 1: Fetching Professional subscription from Stripe...');
  const professionalSub = await stripe.subscriptions.retrieve(PROFESSIONAL_SUB_ID);
  const customerId = professionalSub.customer;
  
  console.log('✅ Professional subscription found:');
  console.log('   - ID:', professionalSub.id);
  console.log('   - Status:', professionalSub.status);
  console.log('   - Customer:', customerId);
  console.log('   - Quantity:', professionalSub.items.data[0].quantity);
  console.log('   - Trial end:', professionalSub.trial_end ? new Date(professionalSub.trial_end * 1000).toISOString() : 'none');
  console.log('');
  
  // ÉTAPE 2: Récupérer TOUS les abonnements du client
  console.log('📋 Step 2: Listing all subscriptions for customer...');
  const allSubscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100,
  });
  
  console.log(`Found ${allSubscriptions.data.length} subscription(s):\n`);
  
  // ÉTAPE 3: Annuler tous les autres abonnements actifs
  console.log('🗑️  Step 3: Canceling old subscriptions...');
  for (const sub of allSubscriptions.data) {
    if (sub.id !== PROFESSIONAL_SUB_ID && (sub.status === 'active' || sub.status === 'trialing')) {
      console.log(`   Canceling: ${sub.id} (${sub.items.data[0]?.price?.nickname || 'unknown'})`);
      await stripe.subscriptions.cancel(sub.id);
      console.log('   ✅ Canceled');
    } else if (sub.id === PROFESSIONAL_SUB_ID) {
      console.log(`   ✓ Keeping: ${sub.id} (Professional - active)`);
    }
  }
  console.log('');
  
  // ÉTAPE 4: Mettre à jour Supabase
  console.log('💾 Step 4: Updating Supabase database...');
  const { error: updateError } = await supabase
    .from('cabinets')
    .update({
      subscription_plan: 'professionnel',
      max_members: professionalSub.items.data[0].quantity,
      stripe_subscription_id: professionalSub.id,
      stripe_subscription_item_id: professionalSub.items.data[0].id,
      stripe_customer_id: customerId,
      subscription_status: professionalSub.status,
      current_period_end: new Date(professionalSub.current_period_end * 1000).toISOString(),
      billing_period: 'monthly',
      updated_at: new Date().toISOString(),
    })
    .eq('id', CABINET_ID);
  
  if (updateError) {
    console.error('❌ Error updating Supabase:', updateError);
    process.exit(1);
  }
  
  console.log('✅ Supabase updated successfully\n');
  
  // ÉTAPE 5: Vérifier la mise à jour
  console.log('🔍 Step 5: Verifying update...');
  const { data: cabinet, error: fetchError } = await supabase
    .from('cabinets')
    .select('*')
    .eq('id', CABINET_ID)
    .single();
  
  if (fetchError || !cabinet) {
    console.error('❌ Error fetching cabinet:', fetchError);
    process.exit(1);
  }
  
  console.log('Cabinet data:');
  console.log('   - subscription_plan:', cabinet.subscription_plan);
  console.log('   - max_members:', cabinet.max_members);
  console.log('   - stripe_subscription_id:', cabinet.stripe_subscription_id);
  console.log('   - stripe_customer_id:', cabinet.stripe_customer_id);
  console.log('   - subscription_status:', cabinet.subscription_status);
  console.log('');
  
  console.log('✅ SYNC COMPLETE! Everything is now synchronized:');
  console.log('   ✓ Stripe: Only Professional subscription active');
  console.log('   ✓ Supabase: Updated to professionnel plan');
  console.log('   ✓ Ready to display on website');
}

syncStripeAndSupabase().catch(console.error);
