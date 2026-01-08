import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { priceId, successUrl, cancelUrl, customerEmail, cabinetId, quantity } = await req.json()

    console.log('=== CHECKOUT REQUEST START ===');
    console.log('Plan (priceId):', priceId);
    console.log('Members count (quantity):', quantity);
    console.log('Cabinet ID:', cabinetId || 'NEW USER');
    console.log('Customer email:', customerEmail || 'WILL BE COLLECTED');
    console.log('Success URL:', successUrl);
    console.log('Cancel URL:', cancelUrl);

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

    // Configuration de la session Checkout pour paiements internationaux
    const sessionParams: any = {
      mode: 'subscription',
      // Support de multiples méthodes de paiement pour tous les pays
      payment_method_types: ['card', 'sepa_debit', 'bancontact', 'ideal', 'giropay', 'sofort'],
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      success_url: successUrl || `${req.headers.get('origin')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/subscription`,
      billing_address_collection: 'auto',
      locale: 'fr',
      
      // 🎨 PERSONNALISATION: Collecte d'adresse pour la facturation
      phone_number_collection: {
        enabled: true,
      },
      
      // Métadonnées pour le webhook
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
      // Pour un customer existant, on permet la mise à jour des infos
      sessionParams.customer_update = {
        address: 'auto',
        name: 'auto',
      }
    } else if (customerEmail) {
      // Création d'un nouveau customer avec email pré-rempli
      sessionParams.customer_email = customerEmail
    }
    // Sinon, Stripe collectera l'email pendant le checkout

    console.log('Creating Stripe session with params:', JSON.stringify(sessionParams, null, 2))

    // Créer la session Checkout
    console.log('Calling Stripe API...');
    const session = await stripe.checkout.sessions.create(sessionParams)

    console.log('✅ Session created successfully!');
    console.log('Session ID:', session.id);
    console.log('Session URL:', session.url);

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ ERROR creating checkout session');
    console.error('Error name:', error.name);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error statusCode:', error.statusCode);
    console.error('Full error:', JSON.stringify(error, null, 2))
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: error.type,
        code: error.code,
        statusCode: error.statusCode
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
