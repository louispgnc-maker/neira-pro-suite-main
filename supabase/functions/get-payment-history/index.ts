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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { customerId } = await req.json()

    if (!customerId) {
      throw new Error('Customer ID is required')
    }

    console.log('📋 Fetching payment history for customer:', customerId)

    // Récupérer les charges (paiements one-time)
    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 100,
    })

    // Récupérer les factures (subscriptions)
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
    })

    // Combiner et formatter les paiements
    const payments = [
      // Paiements directs (charges)
      ...charges.data.map(charge => ({
        id: charge.id,
        amount: charge.amount,
        currency: charge.currency,
        status: charge.status === 'succeeded' ? 'succeeded' : charge.status === 'pending' ? 'pending' : 'failed',
        description: charge.description || 'Paiement Neira',
        created_at: new Date(charge.created * 1000).toISOString(),
        payment_method: charge.payment_method_details ? {
          type: charge.payment_method_details.type,
          brand: charge.payment_method_details.card?.brand,
          last4: charge.payment_method_details.card?.last4,
        } : undefined,
        receipt_url: charge.receipt_url,
      })),
      // Factures d'abonnements
      ...invoices.data
        .filter(invoice => invoice.status === 'paid' || invoice.status === 'open' || invoice.status === 'uncollectible')
        .map(invoice => ({
          id: invoice.id,
          amount: invoice.amount_paid || invoice.amount_due,
          currency: invoice.currency,
          status: invoice.status === 'paid' ? 'succeeded' : invoice.status === 'open' ? 'pending' : 'failed',
          description: invoice.description || `Facture ${invoice.number || invoice.id}`,
          created_at: new Date(invoice.created * 1000).toISOString(),
          payment_method: invoice.charge ? undefined : undefined, // TODO: récupérer depuis charge si nécessaire
          invoice_url: invoice.hosted_invoice_url,
          receipt_url: invoice.invoice_pdf,
        }))
    ]

    // Trier par date décroissante
    payments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    console.log(`✅ Found ${payments.length} payments`)

    return new Response(
      JSON.stringify({ payments }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ Error fetching payment history:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch payment history' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
