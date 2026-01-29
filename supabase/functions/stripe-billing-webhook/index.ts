import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('No stripe signature found')
    }

    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_BILLING')!
    
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message)
      return new Response(JSON.stringify({ error: 'Webhook signature verification failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    console.log('📨 Received Stripe webhook:', event.type)

    // Gérer l'événement invoice.paid (facturation mensuelle)
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice
      
      // Récupérer le customer ID
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
      
      if (!customerId) {
        console.log('⚠️ No customer ID found in invoice')
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      console.log('🔍 Looking for cabinet with Stripe customer:', customerId)

      // Trouver le cabinet correspondant
      const { data: cabinet, error: cabinetError } = await supabase
        .from('cabinets')
        .select('id, subscription_plan')
        .eq('stripe_customer_id', customerId)
        .single()

      if (cabinetError || !cabinet) {
        console.log('⚠️ Cabinet not found for customer:', customerId)
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      console.log('✅ Found cabinet:', cabinet.id, 'with plan:', cabinet.subscription_plan)

      // Réinitialiser les quotas de signatures pour ce cabinet
      const { error: resetError } = await supabase.rpc('handle_billing_cycle_reset', {
        cabinet_id_param: cabinet.id
      })

      if (resetError) {
        console.error('❌ Error resetting signatures:', resetError)
        throw resetError
      }

      console.log('🔄 Signatures quotas reset for cabinet:', cabinet.id)

      return new Response(
        JSON.stringify({ 
          received: true,
          cabinet_id: cabinet.id,
          action: 'signatures_reset'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Autres événements non gérés
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
