import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripeKey = process.env.STRIPE_SECRET_KEY;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeKey || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-11-20.acacia',
});

const supabase = createClient(
  'https://elysrdqujzlbvnjfilvh.supabase.co',
  supabaseKey
);

const PRICE_TO_TIER = {
  'price_1Sw3kI7epLIfQ2kHKNMxZmWk': 'essentiel',
  'price_1Sw3kI7epLIfQ2kHerSaOUnH': 'essentiel',
  'price_1Sw3kJ7epLIfQ2kHouItA7j4': 'professionnel',
  'price_1Sw3kK7epLIfQ2kHQ85fUBwh': 'professionnel',
  'price_1Sw3kL7epLIfQ2kHLI9QWT7H': 'cabinet-plus',
  'price_1Sw3kL7epLIfQ2kHkyG6nqV4': 'cabinet-plus',
};

async function fixSubscriptionPlan(cabinetId) {
  console.log('🔍 Checking cabinet:', cabinetId);
  
  // Récupérer le cabinet
  const { data: cabinet, error } = await supabase
    .from('cabinets')
    .select('*')
    .eq('id', cabinetId)
    .single();
  
  if (error || !cabinet) {
    console.error('❌ Cabinet not found:', error);
    return;
  }
  
  console.log('Current subscription_plan:', cabinet.subscription_plan);
  console.log('Stripe subscription ID:', cabinet.stripe_subscription_id);
  
  if (!cabinet.stripe_subscription_id) {
    console.log('⚠️ No Stripe subscription found');
    return;
  }
  
  // Récupérer l'abonnement Stripe
  const subscription = await stripe.subscriptions.retrieve(cabinet.stripe_subscription_id);
  const priceId = subscription.items.data[0]?.price.id;
  const correctTier = PRICE_TO_TIER[priceId] || 'essentiel';
  const quantity = subscription.items.data[0]?.quantity || 1;
  
  console.log('Stripe price ID:', priceId);
  console.log('Correct tier:', correctTier);
  console.log('Quantity:', quantity);
  
  if (cabinet.subscription_plan !== correctTier) {
    console.log(`🔧 Updating subscription_plan from "${cabinet.subscription_plan}" to "${correctTier}"`);
    
    const { error: updateError } = await supabase
      .from('cabinets')
      .update({
        subscription_plan: correctTier,
        max_members: quantity,
        stripe_subscription_item_id: subscription.items.data[0]?.id,
      })
      .eq('id', cabinetId);
    
    if (updateError) {
      console.error('❌ Update error:', updateError);
    } else {
      console.log('✅ Cabinet updated successfully!');
    }
  } else {
    console.log('✅ Subscription plan is already correct');
  }
}

// Utiliser l'ID du cabinet depuis les logs de la console
const cabinetId = '85e7f59a-ac19-476d-8484-6e4988b9638d';
fixSubscriptionPlan(cabinetId);
