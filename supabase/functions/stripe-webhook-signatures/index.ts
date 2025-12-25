import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    // Gérer uniquement les paiements réussis
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      const metadata = session.metadata
      if (!metadata) {
        throw new Error('Métadonnées manquantes')
      }

      const {
        user_id,
        target_user_id,
        cabinet_id,
        signature_quantity,
        signature_price,
        prorata_amount,
        expires_at,
      } = metadata

      // Initialiser Supabase avec la clé service (pour bypass RLS)
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Créditer les signatures maintenant que le paiement est confirmé
      const { error: updateError } = await supabaseAdmin
        .from('cabinet_members')
        .update({
          signature_addon_quantity: parseInt(signature_quantity),
          signature_addon_price: parseFloat(signature_price),
          signature_addon_purchased_at: new Date().toISOString(),
          signature_addon_expires_at: expires_at,
        })
        .eq('cabinet_id', cabinet_id)
        .eq('user_id', target_user_id)

      if (updateError) {
        console.error('Erreur mise à jour signatures:', updateError)
        throw new Error('Erreur lors du crédit des signatures')
      }

      console.log('✅ Signatures créditées avec succès:', {
        user_id: target_user_id,
        cabinet_id,
        quantity: signature_quantity,
        amount_paid: prorata_amount,
      })

      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Erreur webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
