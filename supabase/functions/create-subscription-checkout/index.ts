import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
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

    console.log('Checkout request:', { priceId, cabinetId, quantity, customerEmail })

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
      payment_method_types: ['sepa_debit', 'card'], // SEPA en priorité
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

    console.log('Creating Stripe session with params:', sessionParams)

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create(sessionParams)

    console.log('Session created:', session.id)

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
