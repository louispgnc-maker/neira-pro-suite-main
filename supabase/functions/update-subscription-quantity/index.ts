import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { subscriptionItemId, quantity } = await req.json()

    if (!subscriptionItemId || !quantity) {
      throw new Error('Subscription item ID and quantity are required')
    }

    // Mettre à jour la quantity dans Stripe
    const updatedItem = await stripe.subscriptionItems.update(subscriptionItemId, {
      quantity: quantity,
      proration_behavior: 'always_invoice', // Créer une facture prorata immédiatement
    })

    console.log('✅ Subscription quantity updated:', {
      subscriptionItemId,
      newQuantity: quantity,
      proration: 'always_invoice',
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        quantity: updatedItem.quantity,
        subscription: updatedItem.subscription,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ Error updating subscription quantity:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
