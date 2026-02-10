import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE2MzMxNCwiZXhwIjoyMDc3NzM5MzE0fQ.sR6o9PVKYtQlthqjx5JA8gAEb0FqJxO3uwxpR9uOQFo';
const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  console.error('❌ STRIPE_SECRET_KEY manquante');
  console.error('Usage: STRIPE_SECRET_KEY=sk_test_... node sync-stripe-subscriptions.mjs');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });

console.log('🔄 Synchronisation des subscription IDs depuis Stripe...\n');

async function syncSubscriptions() {
  try {
    // 1. Récupérer tous les cabinets sans stripe_subscription_id
    const { data: cabinets, error: cabinetsError } = await supabase
      .from('cabinets')
      .select('id, nom, owner_id, stripe_customer_id')
      .is('stripe_subscription_id', null)
      .not('subscription_status', 'eq', 'canceled');

    if (cabinetsError) {
      throw cabinetsError;
    }

    console.log(`📊 ${cabinets.length} cabinets trouvés sans subscription ID\n`);

    let updated = 0;
    let notFound = 0;

    for (const cabinet of cabinets) {
      console.log(`🔍 Cabinet: ${cabinet.nom} (${cabinet.id})`);

      try {
        // 2. Récupérer l'email de l'owner
        const { data: userData } = await supabase.auth.admin.getUserById(cabinet.owner_id);
        const email = userData.user?.email;

        if (!email) {
          console.log('   ⚠️  Email non trouvé');
          notFound++;
          continue;
        }

        console.log(`   📧 Email: ${email}`);

        // 3. Chercher les subscriptions Stripe pour cet email
        const customers = await stripe.customers.list({
          email: email,
          limit: 10,
        });

        if (customers.data.length === 0) {
          console.log('   ⚠️  Aucun customer Stripe trouvé');
          notFound++;
          continue;
        }

        // 4. Pour chaque customer, chercher les subscriptions actives
        let foundSubscription = null;

        for (const customer of customers.data) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            limit: 10,
          });

          // Chercher une subscription active ou en trial
          const activeSubscription = subscriptions.data.find(
            sub => sub.status === 'active' || sub.status === 'trialing'
          );

          if (activeSubscription) {
            foundSubscription = activeSubscription;
            break;
          }
        }

        if (!foundSubscription) {
          console.log('   ⚠️  Aucune subscription active trouvée');
          notFound++;
          continue;
        }

        // 5. Mettre à jour le cabinet avec les infos Stripe
        console.log(`   ✅ Subscription trouvée: ${foundSubscription.id}`);
        console.log(`      Status: ${foundSubscription.status}`);

        const { error: updateError } = await supabase
          .from('cabinets')
          .update({
            stripe_customer_id: foundSubscription.customer,
            stripe_subscription_id: foundSubscription.id,
            stripe_subscription_item_id: foundSubscription.items.data[0]?.id,
            subscription_status: foundSubscription.status,
          })
          .eq('id', cabinet.id);

        if (updateError) {
          console.error('   ❌ Erreur mise à jour:', updateError);
        } else {
          console.log('   ✅ Cabinet mis à jour avec succès\n');
          updated++;
        }

      } catch (error) {
        console.error(`   ❌ Erreur pour ce cabinet:`, error.message);
        notFound++;
      }
    }

    console.log('\n📊 Résumé:');
    console.log(`   ✅ Mis à jour: ${updated}`);
    console.log(`   ⚠️  Non trouvés: ${notFound}`);
    console.log(`   📝 Total: ${cabinets.length}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

syncSubscriptions();
