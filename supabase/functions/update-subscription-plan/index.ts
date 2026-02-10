import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Non authentifié')
    }

    const { cabinetId, newPriceId, quantity } = await req.json()

    if (!cabinetId || !newPriceId || !quantity) {
      throw new Error('Paramètres manquants')
    }

    console.log('🔄 Update subscription plan:', { cabinetId, newPriceId, quantity })

    // Vérifier que l'utilisateur est Fondateur du cabinet
    const { data: memberData, error: memberError } = await supabaseClient
      .from('cabinet_members')
      .select('role_cabinet')
      .eq('cabinet_id', cabinetId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !memberData || memberData.role_cabinet !== 'Fondateur') {
      throw new Error('Seul le Fondateur peut modifier l\'abonnement')
    }

    // Récupérer l'abonnement actuel
    const { data: cabinetData, error: cabinetError } = await supabaseClient
      .from('cabinets')
      .select('stripe_subscription_id, stripe_subscription_item_id')
      .eq('id', cabinetId)
      .single()

    if (cabinetError || !cabinetData?.stripe_subscription_id) {
      throw new Error('Abonnement non trouvé')
    }

    const subscriptionId = cabinetData.stripe_subscription_id
    const subscriptionItemId = cabinetData.stripe_subscription_item_id

    console.log('Current subscription:', subscriptionId)
    console.log('Current subscription item:', subscriptionItemId)

    // Récupérer l'abonnement Stripe pour garder trial_end
    const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId)
    
    // ✅ CONSERVER LA DATE DE FIN D'ESSAI ORIGINALE
    const trialEnd = currentSubscription.trial_end
    const isInTrial = currentSubscription.status === 'trialing'
    
    console.log('Trial status:', { isInTrial, trialEnd })

    // Mettre à jour l'item de l'abonnement
    await stripe.subscriptionItems.update(subscriptionItemId, {
      price: newPriceId,
      quantity: quantity,
    })

    // Si on est en période d'essai, s'assurer que trial_end ne change pas
    if (isInTrial && trialEnd) {
      await stripe.subscriptions.update(subscriptionId, {
        trial_end: trialEnd, // ✅ GARDER LA MÊME DATE
        proration_behavior: 'none', // Pas de prorata pendant l'essai
      })
      console.log('✅ Trial end preserved:', new Date(trialEnd * 1000).toISOString())
    } else {
      // Hors essai : appliquer le prorata normal
      await stripe.subscriptions.update(subscriptionId, {
        proration_behavior: 'always_invoice',
      })
    }

    console.log('✅ Subscription updated successfully')

    // ✅ Mettre à jour immédiatement la BDD (sans attendre le webhook)
    const updatedSubscription = await stripe.subscriptions.retrieve(subscriptionId)
    const priceId = updatedSubscription.items.data[0]?.price.id
    
    // Mapper le price ID vers le tier
    const PRICE_TO_TIER: Record<string, string> = {
      'price_1Sw3kI7epLIfQ2kHKNMxZmWk': 'essentiel',
      'price_1Sw3kI7epLIfQ2kHerSaOUnH': 'essentiel',
      'price_1Sw3kJ7epLIfQ2kHouItA7j4': 'professionnel',
      'price_1Sw3kK7epLIfQ2kHQ85fUBwh': 'professionnel',
      'price_1Sw3kL7epLIfQ2kHLI9QWT7H': 'cabinet-plus',
      'price_1Sw3kL7epLIfQ2kHkyG6nqV4': 'cabinet-plus',
    }
    
    const tier = PRICE_TO_TIER[priceId || ''] || 'essentiel'

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabaseAdmin
      .from('cabinets')
      .update({
        subscription_plan: tier,
        max_members: quantity,
        stripe_subscription_item_id: updatedSubscription.items.data[0]?.id,
      })
      .eq('id', cabinetId)

    console.log('✅ Database updated:', { cabinetId, tier, quantity })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Abonnement mis à jour avec succès',
        plan: tier,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('Error updating subscription:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Erreur lors de la mise à jour',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
