import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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

    const requestBody = await req.json()
    
    console.log('📦 Body brut reçu:', JSON.stringify(requestBody, null, 2))
    
    const { 
      quantity,
      price,
      prorataAmount,
      cabinetId,
      targetUserId,
      expiresAt,
      role,
      userId
    } = requestBody

    console.log('📦 Données extraites:', {
      quantity: `${quantity} (type: ${typeof quantity})`,
      price: `${price} (type: ${typeof price})`,
      prorataAmount: `${prorataAmount} (type: ${typeof prorataAmount})`,
      cabinetId,
      targetUserId,
      expiresAt,
      role,
      userId
    })

    // Validation des données (accepte 0 comme valeur valide)
    if (
      quantity === undefined || quantity === null ||
      price === undefined || price === null ||
      prorataAmount === undefined || prorataAmount === null ||
      !cabinetId || !targetUserId || !expiresAt || !role || !userId
    ) {
      console.error('❌ Données manquantes ou invalides:', {
        quantity: quantity,
        price: price,
        prorataAmount: prorataAmount,
        cabinetId: cabinetId,
        targetUserId: targetUserId,
        expiresAt: expiresAt,
        role: role,
        userId: userId
      })
      throw new Error('Données requises manquantes ou invalides')
    }

    // Mapping des quantités vers les price IDs Stripe LIVE (correspond aux vrais produits créés)
    const priceIdMap: Record<number, string> = {
      1: 'price_1Sw3kM7epLIfQ2kHt1zfE9qT',      // Urgence - 1 signature - 3€
      10: 'price_1Sw3kN7epLIfQ2kHeeQ9pRHx',     // Mini - 10 signatures - 20€
      25: 'price_1Sw3kN7epLIfQ2kHARbz9fsy',     // Starter - 25 signatures - 30€
      50: 'price_1Sw3kO7epLIfQ2kHv8V9wQHT',     // Pro - 50 signatures - 45€
      100: 'price_1Sw3kP7epLIfQ2kHnaY2dWHL',    // Business - 100 signatures - 70€
      250: 'price_1Sw3kQ7epLIfQ2kHs1GvAevQ'     // Enterprise - 250 signatures - 140€
    };

    const priceId = priceIdMap[quantity];
    if (!priceId) {
      console.error('❌ Quantité invalide:', quantity, 'Quantités valides:', Object.keys(priceIdMap));
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
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `Achat de ${quantity} crédits signature${quantity > 1 ? 's' : ''}`,
          metadata: {
            cabinet_id: cabinetId,
            signature_quantity: quantity.toString(),
          },
        },
      },
      success_url: `${req.headers.get('origin') || 'https://neira.fr'}/${role === 'notaire' ? 'notaires' : 'avocats'}/cabinet?id=${cabinetId}&payment=success`,
      cancel_url: `${req.headers.get('origin') || 'https://neira.fr'}/${role === 'notaire' ? 'notaires' : 'avocats'}/cabinet?id=${cabinetId}&payment=cancelled`,
      metadata: {
        user_id: userId,
        target_user_id: targetUserId || userId,
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
