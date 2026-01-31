import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    
    console.log('🔐 Utilisateur authentifié:', user?.id)
    
    if (!user) {
      throw new Error('Non authentifié')
    }

    const { 
      quantity,
      price,
      prorataAmount,
      cabinetId,
      targetUserId,
      expiresAt,
      role
    } = await req.json()

    console.log('📦 Données reçues:', {
      quantity,
      price,
      prorataAmount,
      cabinetId,
      targetUserId,
      expiresAt,
      role
    })

    // Validation des données (accepte 0 comme valeur valide)
    if (
      quantity === undefined || quantity === null ||
      price === undefined || price === null ||
      prorataAmount === undefined || prorataAmount === null ||
      !cabinetId || !targetUserId || !expiresAt || !role
    ) {
      console.error('❌ Données manquantes ou invalides:', {
        quantity: quantity,
        price: price,
        prorataAmount: prorataAmount,
        cabinetId: cabinetId,
        targetUserId: targetUserId,
        expiresAt: expiresAt,
        role: role
      })
      throw new Error('Données requises manquantes ou invalides')
    }

    // Mapping des quantités vers les price IDs Stripe
    const priceIdMap: Record<number, string> = {
      1: 'price_1SvlbL7ECruIACYyCLSpS0r2',
      10: 'price_1SvlZu7ECruIACYyJMb1q5kK',
      20: 'price_1SvlaL7ECruIACYy3ktNjFhY',
      50: 'price_1Svlac7ECruIACYyttwqZ7fQ',
      100: 'price_1Svlb17ECruIACYy1Gyn7ioO',
      250: 'price_1Svlbb7ECruIACYyxQV2lV49'
    };

    const priceId = priceIdMap[quantity];
    if (!priceId) {
      throw new Error(`Aucun price ID trouvé pour la quantité ${quantity}`);
    }

    // Créer une Checkout Session Stripe avec le price ID
    console.log('💳 Création de la session Stripe avec price ID:', priceId)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin') || 'https://neira.fr'}/${role === 'notaire' ? 'notaires' : 'avocats'}/dashboard?signature_payment=success`,
      cancel_url: `${req.headers.get('origin') || 'https://neira.fr'}/${role === 'notaire' ? 'notaires' : 'avocats'}/dashboard?signature_payment=cancelled`,
      metadata: {
        user_id: user.id,
        target_user_id: targetUserId || user.id,
        cabinet_id: cabinetId,
        signature_quantity: quantity.toString(),
        signature_price: price.toString(),
        prorata_amount: prorataAmount.toString(),
        expires_at: expiresAt,
        role: role,
      },
    })

    console.log('✅ Session Stripe créée avec succès:', {
      sessionId: session.id,
      url: session.url
    })

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ Erreur création session:', error)
    console.error('❌ Détails de l\'erreur:', JSON.stringify(error, null, 2))
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur inconnue' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
