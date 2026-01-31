import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { sendPaymentConfirmationEmail } from '../_shared/emailHelpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { customerEmail, customerName, subscriptionTier, quantity, billingPeriod } = await req.json()

    if (!customerEmail) {
      throw new Error('Email client requis')
    }

    // Prix selon le plan et la période
    const prices: Record<string, { monthly: number; yearly: number }> = {
      essentiel: { monthly: 39, yearly: 390 },
      professionnel: { monthly: 79, yearly: 790 },
      'cabinet-plus': { monthly: 149, yearly: 1490 }
    }

    const planPrices = prices[subscriptionTier] || prices.essentiel
    const amount = billingPeriod === 'yearly' ? planPrices.yearly : planPrices.monthly

    // Calculer le montant total (prix × nombre d'utilisateurs)
    const totalAmount = amount * (quantity || 1)

    // Envoyer l'email
    await sendPaymentConfirmationEmail({
      customerEmail,
      customerName: customerName || customerEmail.split('@')[0],
      subscriptionTier,
      quantity: quantity || 1,
      amount: totalAmount * 100, // en centimes
      currency: 'EUR',
      invoiceUrl: '' // Pas de facture Stripe pour l'instant
    })

    console.log('✅ Email de confirmation envoyé à:', customerEmail)

    return new Response(
      JSON.stringify({ success: true, message: 'Email envoyé avec succès' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
