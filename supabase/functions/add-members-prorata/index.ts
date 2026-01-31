import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { cabinetId, newMembersCount, prorataAmount } = await req.json()

    console.log('=== ADD MEMBERS PRORATA REQUEST ===');
    console.log('Cabinet ID:', cabinetId);
    console.log('New members count:', newMembersCount);
    console.log('Prorata amount (cents):', prorataAmount);

    if (!cabinetId || !newMembersCount || !prorataAmount) {
      throw new Error('Cabinet ID, new members count, and prorata amount are required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Récupérer les infos du cabinet
    const { data: cabinet, error: cabinetError } = await supabase
      .from('cabinets')
      .select('stripe_customer_id, nom, subscription_plan')
      .eq('id', cabinetId)
      .single()

    if (cabinetError || !cabinet) {
      throw new Error('Cabinet not found')
    }

    console.log('Cabinet:', cabinet.nom);
    console.log('Existing customer ID:', cabinet.stripe_customer_id);

    // Si pas de customer Stripe, en créer un
    let customerId = cabinet.stripe_customer_id
    
    if (!customerId) {
      console.log('Creating new Stripe customer...');
      const customer = await stripe.customers.create({
        metadata: {
          cabinet_id: cabinetId,
        },
      })
      customerId = customer.id

      // Mettre à jour le cabinet avec le customer ID
      await supabase
        .from('cabinets')
        .update({ stripe_customer_id: customerId })
        .eq('id', cabinetId)
      
      console.log('Customer created:', customerId);
    }

    // Créer une session de checkout pour un paiement unique (prorata)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', // Paiement unique, pas d'abonnement
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Ajout de membres - ${cabinet.nom}`,
              description: `Prorata pour les jours restants du cycle de facturation`,
            },
            unit_amount: prorataAmount, // en centimes
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get('origin')}/avocats/subscription?payment=success&members_updated=true`,
      cancel_url: `${req.headers.get('origin')}/avocats/manage-members`,
      locale: 'fr',
      metadata: {
        cabinet_id: cabinetId,
        new_members_count: newMembersCount.toString(),
        payment_type: 'members_prorata',
      },
    })

    console.log('✅ Checkout session created:', session.id);

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ ERROR:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Erreur interne',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
