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

    // Récupérer l'abonnement actuel pour calculer le prorata
    const subscriptionItem = await stripe.subscriptionItems.retrieve(subscriptionItemId)
    const subscription = await stripe.subscriptions.retrieve(subscriptionItem.subscription as string)
    
    // Calculer le prorata
    const now = Math.floor(Date.now() / 1000)
    const periodEnd = subscription.current_period_end
    const periodStart = subscription.current_period_start
    const totalPeriodDays = Math.ceil((periodEnd - periodStart) / 86400)
    const remainingDays = Math.ceil((periodEnd - now) / 86400)
    
    const currentQuantity = subscriptionItem.quantity || 1
    const quantityDiff = quantity - currentQuantity
    const pricePerUnit = subscriptionItem.price?.unit_amount || 0 // en centimes
    
    // Calcul du prorata en centimes
    const prorataAmountCents = Math.abs(quantityDiff) * pricePerUnit * (remainingDays / totalPeriodDays)
    
    // Arrondir à l'euro supérieur (en centimes: arrondir à 100 centimes près vers le haut)
    const prorataRoundedCents = Math.ceil(prorataAmountCents / 100) * 100
    const prorataEuros = prorataRoundedCents / 100

    console.log('📊 Prorata calculation:', {
      currentQuantity,
      newQuantity: quantity,
      quantityDiff,
      pricePerUnit: pricePerUnit / 100 + '€',
      totalPeriodDays,
      remainingDays,
      prorataBeforeRounding: (prorataAmountCents / 100).toFixed(2) + '€',
      prorataRounded: prorataEuros + '€'
    })

    // Mettre à jour la quantity dans Stripe
    // Pour les ajouts: proratisation immédiate
    // Pour les suppressions: changement effectif mais pas de remboursement prorata
    const updatedItem = await stripe.subscriptionItems.update(subscriptionItemId, {
      quantity: quantity,
      // Si on ajoute des membres: facturer au prorata immédiatement
      // Si on enlève des membres: pas de remboursement, juste réduire à la prochaine facture
      proration_behavior: quantityDiff > 0 ? 'always_invoice' : 'none',
    })

    console.log('✅ Subscription quantity updated:', {
      subscriptionItemId,
      newQuantity: quantity,
      proration: quantityDiff > 0 ? 'always_invoice (ajout)' : 'none (suppression)',
      prorataAmount: quantityDiff > 0 ? prorataEuros + '€' : '0€ (pas de remboursement)'
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        quantity: updatedItem.quantity,
        subscription: updatedItem.subscription,
        prorata: {
          amount: prorataEuros,
          remainingDays,
          totalPeriodDays,
          isAdding: quantityDiff > 0
        }
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
