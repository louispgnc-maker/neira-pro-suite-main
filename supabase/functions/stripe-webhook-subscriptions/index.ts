import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { sendPaymentConfirmationEmail } from '../_shared/emailHelpers.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
})

const PRICE_TO_TIER: Record<string, string> = {
  'price_1Sv3Vl7epLIfQ2kHxrIagkmU': 'essentiel',    // TEST monthly
  'price_1Sv3WB7epLIfQ2kH82SeKT89': 'essentiel',    // TEST yearly
  'price_1Sv3Xr7epLIfQ2kHOjEwtgTE': 'professionnel', // TEST monthly
  'price_1Sv3YJ7epLIfQ2kHKUBQGH6N': 'professionnel', // TEST yearly
  'price_1Sv3ZB7epLIfQ2kHEtN8tlHO': 'cabinet-plus',  // TEST monthly
  'price_1Sv3ZX7epLIfQ2kHGNU91j2Z': 'cabinet-plus',  // TEST yearly
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS')

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('📨 Webhook event:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const cabinetId = session.metadata?.cabinet_id

        if (!cabinetId) {
          console.error('❌ No cabinet_id in metadata')
          break
        }

        // Récupérer la subscription
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          const priceId = subscription.items.data[0]?.price.id
          const tier = PRICE_TO_TIER[priceId] || 'essentiel'
          const quantity = subscription.items.data[0]?.quantity || 1
          
          // Récupérer le payment method
          let paymentMethodType = 'unknown'
          let paymentMethodLast4 = null
          let paymentMethodBrand = null

          if (subscription.default_payment_method) {
            const pm = await stripe.paymentMethods.retrieve(subscription.default_payment_method as string)
            paymentMethodType = pm.type
            if (pm.type === 'card') {
              paymentMethodLast4 = pm.card?.last4
              paymentMethodBrand = pm.card?.brand
            }
          }

          // Mettre à jour le cabinet
          const { error: updateError } = await supabaseAdmin
            .from('cabinets')
            .update({
              stripe_customer_id: subscription.customer as string,
              stripe_subscription_id: subscription.id,
              stripe_subscription_item_id: subscription.items.data[0]?.id,
              subscription_tier: tier,
              subscription_status: 'active',
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              quantity_members: quantity,
              payment_method_type: paymentMethodType,
              payment_method_last4: paymentMethodLast4,
              payment_method_brand: paymentMethodBrand,
              subscription_started_at: subscription.started_at ? new Date(subscription.started_at * 1000).toISOString() : new Date().toISOString(),
            })
            .eq('id', cabinetId)

          if (updateError) {
            console.error('❌ Error updating cabinet:', updateError)
          }

          // Récupérer les infos du cabinet et du owner pour l'email
          const { data: cabinetData } = await supabaseAdmin
            .from('cabinets')
            .select(`
              id,
              name,
              cabinet_members!inner(
                user_id,
                role,
                users(email, full_name)
              )
            `)
            .eq('id', cabinetId)
            .single()

          if (cabinetData) {
            // Trouver le owner
            const owner = cabinetData.cabinet_members?.find((m: any) => m.role === 'owner')
            
            if (owner?.users) {
              const customerEmail = owner.users.email
              const customerName = owner.users.full_name || 'Client'
              
              // Récupérer l'invoice pour le montant et l'URL
              const latestInvoiceId = subscription.latest_invoice
              let amount = 0
              let invoiceUrl = ''
              
              if (latestInvoiceId) {
                const invoice = await stripe.invoices.retrieve(latestInvoiceId as string)
                amount = invoice.total || 0
                invoiceUrl = invoice.hosted_invoice_url || invoice.invoice_pdf || ''
              }

              // Créer la facture dans la base de données
              await supabaseAdmin
                .from('invoices')
                .insert({
                  cabinet_id: cabinetId,
                  stripe_invoice_id: latestInvoiceId as string,
                  amount: amount / 100, // Convertir en euros
                  currency: 'eur',
                  status: 'paid',
                  invoice_pdf: invoiceUrl,
                  period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                  period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                  created_at: new Date().toISOString(),
                })

              // Envoyer l'email de confirmation
              await sendPaymentConfirmationEmail({
                customerEmail,
                customerName,
                subscriptionTier: tier,
                quantity,
                amount,
                currency: 'EUR',
                invoiceUrl,
              })

              console.log('✅ Email envoyé et facture créée pour:', customerEmail)
            }
          }

          console.log('✅ Checkout completed:', { cabinetId, tier, quantity })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const cabinetId = subscription.metadata?.cabinet_id

        if (!cabinetId) {
          console.error('❌ No cabinet_id in metadata')
          break
        }

        const priceId = subscription.items.data[0]?.price.id
        const tier = PRICE_TO_TIER[priceId] || 'essentiel'

        await supabaseAdmin
          .from('cabinets')
          .update({
            subscription_tier: tier,
            subscription_status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            quantity_members: subscription.items.data[0]?.quantity || 1,
          })
          .eq('id', cabinetId)

        console.log('✅ Subscription updated:', { cabinetId, tier, status: subscription.status })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const cabinetId = subscription.metadata?.cabinet_id

        if (!cabinetId) {
          console.error('❌ No cabinet_id in metadata')
          break
        }

        await supabaseAdmin
          .from('cabinets')
          .update({
            subscription_status: 'canceled',
          })
          .eq('id', cabinetId)

        console.log('✅ Subscription canceled:', { cabinetId })
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('✅ Invoice paid:', invoice.id)
        // Optionnel: log des factures payées
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        
        // Trouver le cabinet par customer_id
        const { data: cabinet } = await supabaseAdmin
          .from('cabinets')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (cabinet) {
          await supabaseAdmin
            .from('cabinets')
            .update({ subscription_status: 'past_due' })
            .eq('id', cabinet.id)

          console.log('⚠️ Payment failed:', { cabinetId: cabinet.id })
        }
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
