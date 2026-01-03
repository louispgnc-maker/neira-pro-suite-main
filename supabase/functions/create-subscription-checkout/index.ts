import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
console.log('Stripe key loaded:', stripeKey ? `sk_live_...${stripeKey.slice(-4)}` : 'MISSING');

if (!stripeKey) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}

const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-11-20.acacia',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { priceId, successUrl, cancelUrl, customerEmail, cabinetId, quantity } = await req.json()

    console.log('=== CHECKOUT REQUEST START ===');
    console.log('Plan (priceId):', priceId);
    console.log('Members count (quantity):', quantity);
    console.log('Cabinet ID:', cabinetId || 'NEW USER');
    console.log('Customer email:', customerEmail || 'WILL BE COLLECTED');
    console.log('Success URL:', successUrl);
    console.log('Cancel URL:', cancelUrl);

    if (!priceId || !quantity) {
      throw new Error('Price ID and quantity are required')
    }

    let customerId = null

    // Si cabinetId fourni, vérifier si un customer existe déjà pour ce cabinet
    if (cabinetId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const { data: cabinet } = await supabase
        .from('cabinets')
        .select('stripe_customer_id')
        .eq('id', cabinetId)
        .single()

      customerId = cabinet?.stripe_customer_id

      console.log('Existing customer ID:', customerId)
    } else {
      console.log('No cabinetId provided - creating session for new user')
    }

    // Si pas de customer, on laisse Stripe le créer via customer_email
    const sessionParams: any = {
      mode: 'subscription',
      payment_method_types: ['card'], // Carte uniquement pour commencer
      line_items: [
        {
          price: priceId,
          quantity: quantity, // Nombre de membres
        },
      ],
      success_url: successUrl || `${req.headers.get('origin')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/subscription`,
      billing_address_collection: 'required',
      locale: 'fr',
      metadata: {
        cabinet_id: cabinetId || 'pending',
      },
      subscription_data: {
        metadata: {
          cabinet_id: cabinetId || 'pending',
        },
      },
    }

    // Si customer existant, on l'utilise
    if (customerId) {
      sessionParams.customer = customerId
    } else if (customerEmail) {
      // Sinon, on crée via email si fourni
      sessionParams.customer_email = customerEmail
    }
    // Sinon, Stripe demandera l'email pendant le checkout

    console.log('Creating Stripe session with params:', JSON.stringify(sessionParams, null, 2))

    // Create Checkout Session
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
  } catch (error) {
    console.error('❌ ERROR creating checkout session');
    console.error('Error name:', error.name);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error statusCode:', error.statusCode);
    console.error('Full error:', JSON.stringify(error, null, 2))
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: error.type,
        code: error.code,
        statusCode: error.statusCode
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
