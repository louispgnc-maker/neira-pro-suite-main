import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    const { priceId, successUrl, cancelUrl, customerEmail, cabinetId } = await req.json()

    if (!priceId) {
      throw new Error('Price ID is required')
    }

    // Create Checkout Session with SEPA enabled
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['sepa_debit', 'card'], // SEPA en priorité, carte en fallback
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${req.headers.get('origin')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/subscription`,
      customer_email: customerEmail,
      metadata: {
        cabinet_id: cabinetId,
      },
      subscription_data: {
        metadata: {
          cabinet_id: cabinetId,
        },
      },
      billing_address_collection: 'required', // Requis pour SEPA
      locale: 'fr', // Interface en français
    })

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
