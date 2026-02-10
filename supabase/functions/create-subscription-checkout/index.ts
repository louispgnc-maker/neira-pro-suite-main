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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { priceId, successUrl, cancelUrl, customerEmail, cabinetId, quantity, metadata } = await req.json()

    console.log('=== CHECKOUT REQUEST START ===');
    console.log('Plan (priceId):', priceId);
    console.log('Members count (quantity):', quantity);
    console.log('Cabinet ID:', cabinetId || 'NEW USER');
    console.log('Customer email:', customerEmail || 'WILL BE COLLECTED');
    console.log('Success URL:', successUrl);
    console.log('Cancel URL:', cancelUrl);
    console.log('Metadata:', metadata);

    if (!priceId || !quantity) {
      throw new Error('Price ID and quantity are required')
    }

    // ✨ CALCULER LES JOURS D'ESSAI RESTANTS si changement de plan pendant l'essai
    let trialDays = 7; // Par défaut : 7 jours pour un nouvel abonnement
    
    if (cabinetId) {
      console.log('Checking existing subscription for cabinet:', cabinetId);
      
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const { data: cabinetData } = await supabaseAdmin
        .from('cabinets')
        .select('stripe_subscription_id')
        .eq('id', cabinetId)
        .single();
      
      if (cabinetData?.stripe_subscription_id) {
        console.log('Found existing subscription:', cabinetData.stripe_subscription_id);
        
        // Récupérer l'abonnement Stripe existant
        const existingSubscription = await stripe.subscriptions.retrieve(cabinetData.stripe_subscription_id);
        
        if (existingSubscription.status === 'trialing' && existingSubscription.trial_end) {
          // Calculer les jours restants
          const now = Math.floor(Date.now() / 1000); // timestamp actuel en secondes
          const trialEnd = existingSubscription.trial_end;
          const secondsRemaining = trialEnd - now;
          const daysRemaining = Math.ceil(secondsRemaining / 86400); // 86400 secondes = 1 jour
          
          if (daysRemaining > 0) {
            trialDays = daysRemaining;
            console.log(`✨ Preserving trial period: ${daysRemaining} days remaining (original trial ends: ${new Date(trialEnd * 1000).toISOString()})`);
          }
        } else {
          console.log('Existing subscription is not in trial, using default 7 days');
        }
      }
    }

    console.log(`Trial period for this checkout: ${trialDays} days`);

    console.log('Cabinet ID:', cabinetId || 'NEW USER')
    console.log('Creating checkout session without existing customer lookup')

    // Déterminer si c'est mensuel ou annuel depuis les metadata
    const billingPeriod = metadata?.billing_period || 'monthly'
    const isMonthly = billingPeriod === 'monthly'
    
    // Calculer la date de fin d'engagement (12 mois à partir de maintenant)
    const commitmentEndDate = new Date()
    commitmentEndDate.setMonth(commitmentEndDate.getMonth() + 12)
    const commitmentEndTimestamp = Math.floor(commitmentEndDate.getTime() / 1000)

    console.log(`Billing period: ${billingPeriod}`)
    console.log(`Commitment end date: ${commitmentEndDate.toISOString()} (timestamp: ${commitmentEndTimestamp})`)

    // Configuration de la session Checkout pour paiements internationaux
    const sessionParams: any = {
      mode: 'subscription',
      // Support des cartes bancaires (activation des autres méthodes requise dans Stripe Dashboard)
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      success_url: successUrl || `${req.headers.get('origin')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/subscription`,
      billing_address_collection: 'auto',
      locale: 'fr',
      
      // 🎨 PERSONNALISATION: Collecte d'adresse pour la facturation
      phone_number_collection: {
        enabled: true,
      },
      
      // ⚠️ Message d'information sur l'engagement
      custom_text: {
        submit: {
          message: `🎁 ${trialDays} jour${trialDays > 1 ? 's' : ''} d'essai gratuit puis engagement de 12 mois - Paiement ${billingPeriod === 'monthly' ? 'mensuel' : 'annuel avec -10%'}`,
        },
      },
      
      // Métadonnées pour le webhook
      metadata: {
        cabinet_id: cabinetId || 'pending',
        billing_period: billingPeriod,
        commitment_end_date: commitmentEndDate.toISOString(),
      },
      subscription_data: {
        // 🎁 ESSAI GRATUIT : Utilise les jours restants ou 7 jours par défaut
        trial_period_days: trialDays,
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'cancel', // Annule si pas de moyen de paiement à la fin
          },
        },
        metadata: {
          cabinet_id: cabinetId || 'pending',
          billing_period: billingPeriod,
          commitment_end_date: commitmentEndDate.toISOString(),
          // 🔒 ENGAGEMENT 12 MOIS : Enregistré dans metadata pour gestion ultérieure
          commitment_months: '12',
        },
      },
    }

    // Utiliser l'email du customer si fourni
    if (customerEmail) {
      sessionParams.customer_email = customerEmail
    }

    console.log('Creating Stripe session with params:', JSON.stringify(sessionParams, null, 2))

    // Créer la session Checkout
    console.log('Calling Stripe API...');
    const session = await stripe.checkout.sessions.create(sessionParams)

    console.log('✅ Session created successfully!');
    console.log('Session ID:', session.id);
    console.log('Session URL:', session.url);

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ ERROR creating checkout session');
    console.error('Error name:', error?.name);
    console.error('Error type:', error?.type);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
    console.error('Error statusCode:', error?.statusCode);
    console.error('Full error:', JSON.stringify(error, null, 2))
    
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Erreur interne',
        type: error?.type,
        code: error?.code,
        statusCode: error?.statusCode
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
