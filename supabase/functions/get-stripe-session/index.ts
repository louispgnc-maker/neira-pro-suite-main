import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
})

const PRICE_TO_TIER: Record<string, { tier: string; billingPeriod: string }> = {
  'price_1Sv3Vl7epLIfQ2kHxrIagkmU': { tier: 'essentiel', billingPeriod: 'monthly' },
  'price_1Sv3WB7epLIfQ2kH82SeKT89': { tier: 'essentiel', billingPeriod: 'yearly' },
  'price_1Sv3Xr7epLIfQ2kHOjEwtgTE': { tier: 'professionnel', billingPeriod: 'monthly' },
  'price_1Sv3YJ7epLIfQ2kHKUBQGH6N': { tier: 'professionnel', billingPeriod: 'yearly' },
  'price_1Sv3ZB7epLIfQ2kHEtN8tlHO': { tier: 'cabinet-plus', billingPeriod: 'monthly' },
  'price_1Sv3ZX7epLIfQ2kHGNU91j2Z': { tier: 'cabinet-plus', billingPeriod: 'yearly' },
}

serve(async (req) => {
  // Vérifier la méthode
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const { sessionId } = await req.json()

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Récupérer la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'subscription.items']
    })

    if (!session.subscription) {
      return new Response(JSON.stringify({ error: 'No subscription found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const subscription = session.subscription as Stripe.Subscription
    const priceId = subscription.items.data[0]?.price.id
    const quantity = subscription.items.data[0]?.quantity || 1

    const planInfo = PRICE_TO_TIER[priceId] || { tier: 'essentiel', billingPeriod: 'monthly' }

    return new Response(JSON.stringify({
      tier: planInfo.tier,
      billingPeriod: planInfo.billingPeriod,
      quantity,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: subscription.current_period_end,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Error retrieving session:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
