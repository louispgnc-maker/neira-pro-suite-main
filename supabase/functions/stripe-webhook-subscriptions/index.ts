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
        
        // Vérifier si c'est un paiement de prorata pour ajout de membres
        const paymentType = session.metadata?.payment_type
        
        if (paymentType === 'members_prorata') {
          console.log('💳 Processing members prorata payment')
          const cabinetId = session.metadata?.cabinet_id
          const newMembersCount = parseInt(session.metadata?.new_members_count || '0')
          
          if (cabinetId && newMembersCount > 0) {
            // Mettre à jour le nombre de membres dans le cabinet
            const { error: updateError } = await supabaseAdmin
              .from('cabinets')
              .update({
                max_members: newMembersCount,
                updated_at: new Date().toISOString()
              })
              .eq('id', cabinetId)
            
            if (updateError) {
              console.error('❌ Error updating max_members:', updateError)
            } else {
              console.log('✅ max_members updated to:', newMembersCount)
            }
          }
          
          // Pas besoin de continuer, c'est juste un paiement unique
          break
        }
        
        // Traitement normal pour un nouvel abonnement
        // Essayer de récupérer cabinet_id depuis metadata, sinon chercher par email
        let cabinetId = session.metadata?.cabinet_id
        const customerEmail = session.customer_details?.email || session.metadata?.customer_email

        // Si pas de cabinet_id mais on a un email, chercher le cabinet du user
        if (!cabinetId && customerEmail) {
          console.log('🔍 Searching cabinet for email:', customerEmail)
          
          // Chercher l'utilisateur par email
          const { data: userData } = await supabaseAdmin.auth.admin.listUsers()
          const user = userData.users.find(u => u.email === customerEmail)
          
          if (user) {
            // Chercher le cabinet via cabinet_members (plus fiable que owner_id)
            const { data: memberData } = await supabaseAdmin
              .from('cabinet_members')
              .select('cabinet_id')
              .eq('user_id', user.id)
              .limit(1)
              .single()
            
            if (memberData) {
              cabinetId = memberData.cabinet_id
              console.log('✅ Found cabinet via cabinet_members:', cabinetId)
            } else {
              // Fallback: chercher par owner_id si pas trouvé via membres
              const { data: cabinetData } = await supabaseAdmin
                .from('cabinets')
                .select('id')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()
              
              if (cabinetData) {
                cabinetId = cabinetData.id
                console.log('✅ Found cabinet via owner_id:', cabinetId)
              }
            }
          }
        }

        if (!cabinetId) {
          console.error('❌ No cabinet found for this session')
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
          
          // Déterminer la période de facturation depuis metadata ou depuis l'intervalle Stripe
          const billingPeriod = subscription.metadata?.billing_period || 
                                session.metadata?.billing_period ||
                                (subscription.items.data[0]?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly');
          
          // Calculer la date de fin d'engagement (12 mois à partir de maintenant)
          // Priorité : metadata de la subscription > metadata de la session > calcul par défaut
          let commitmentEndDate: Date;
          if (subscription.metadata?.commitment_end_date) {
            commitmentEndDate = new Date(subscription.metadata.commitment_end_date);
            console.log('Using commitment_end_date from subscription metadata:', commitmentEndDate.toISOString());
          } else if (session.metadata?.commitment_end_date) {
            commitmentEndDate = new Date(session.metadata.commitment_end_date);
            console.log('Using commitment_end_date from session metadata:', commitmentEndDate.toISOString());
          } else {
            // Fallback : calculer 12 mois à partir de la date de début de la subscription
            const startDate = subscription.started_at ? new Date(subscription.started_at * 1000) : new Date();
            commitmentEndDate = new Date(startDate);
            commitmentEndDate.setMonth(commitmentEndDate.getMonth() + 12);
            console.log('Calculated commitment_end_date (12 months from start):', commitmentEndDate.toISOString());
          }

          console.log('Billing period:', billingPeriod);
          console.log('Commitment end date:', commitmentEndDate.toISOString());
          console.log('Subscription cancel_at:', subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : 'none');

          // Mettre à jour le cabinet
          // Déterminer le statut : trialing si en période d'essai, sinon active
          const subscriptionStatus = subscription.status === 'trialing' ? 'trialing' : 'active';
          
          const { error: updateError } = await supabaseAdmin
            .from('cabinets')
            .update({
              stripe_customer_id: subscription.customer as string,
              stripe_subscription_id: subscription.id,
              stripe_subscription_item_id: subscription.items.data[0]?.id,
              subscription_plan: tier,
              subscription_status: subscriptionStatus,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              max_members: quantity,
              payment_method_type: paymentMethodType,
              payment_method_last4: paymentMethodLast4,
              payment_method_brand: paymentMethodBrand,
              subscription_started_at: subscription.started_at ? new Date(subscription.started_at * 1000).toISOString() : new Date().toISOString(),
              billing_period: billingPeriod,
              subscription_commitment_end_date: commitmentEndDate.toISOString(),
              subscription_commitment_months: 12,
            })
            .eq('id', cabinetId)

          if (updateError) {
            console.error('❌ Error updating cabinet:', updateError)
          } else {
            console.log('✅ Cabinet updated successfully')
            
            // 💳 Stocker le stripe_subscription_id dans cabinet_members pour le Fondateur
            // Cela permet la résiliation d'essai de retrouver l'abonnement à annuler
            const { data: founderMember } = await supabaseAdmin
              .from('cabinet_members')
              .select('id')
              .eq('cabinet_id', cabinetId)
              .eq('role_cabinet', 'Fondateur')
              .eq('status', 'active')
              .limit(1)
              .single()
            
            if (founderMember) {
              const { error: memberUpdateError } = await supabaseAdmin
                .from('cabinet_members')
                .update({
                  stripe_subscription_id: subscription.id
                })
                .eq('id', founderMember.id)
              
              if (memberUpdateError) {
                console.error('❌ Error updating founder stripe_subscription_id:', memberUpdateError)
              } else {
                console.log('✅ Founder member updated with stripe_subscription_id')
              }
            }
            
            // 🎁 BONUS ESSAI : Ajouter 5 signatures gratuites pendant la période d'essai
            if (subscription.status === 'trialing' && subscription.trial_end) {
              const trialEndDate = new Date(subscription.trial_end * 1000)
              console.log('🎁 Adding 5 free signatures for trial period until:', trialEndDate.toISOString())
              
              // Récupérer tous les membres actifs du cabinet
              const { data: members } = await supabaseAdmin
                .from('cabinet_members')
                .select('id, user_id, email')
                .eq('cabinet_id', cabinetId)
                .eq('status', 'active')
              
              if (members && members.length > 0) {
                // Ajouter 5 signatures gratuites à chaque membre
                const { error: signaturesError } = await supabaseAdmin
                  .from('cabinet_members')
                  .update({
                    signature_addon_quantity: 5,
                    signature_addon_price: 0, // Gratuit
                    signature_addon_purchased_at: new Date().toISOString(),
                    signature_addon_expires_at: trialEndDate.toISOString()
                  })
                  .eq('cabinet_id', cabinetId)
                  .eq('status', 'active')
                
                if (signaturesError) {
                  console.error('❌ Error adding trial signatures:', signaturesError)
                } else {
                  console.log(`✅ Added 5 trial signatures to ${members.length} member(s)`)
                }
              }
            }
          }

          // Récupérer les infos du cabinet et du owner pour l'email
          const { data: cabinetData } = await supabaseAdmin
            .from('cabinets')
            .select(`
              id,
              nom,
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
        let cabinetId = subscription.metadata?.cabinet_id

        // Si pas de cabinet_id dans metadata, chercher par customer_id
        if (!cabinetId) {
          const customerId = subscription.customer as string
          const { data: cabinetData } = await supabaseAdmin
            .from('cabinets')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single()
          
          if (cabinetData) {
            cabinetId = cabinetData.id
            console.log('✅ Found cabinet by customer_id:', cabinetId)
          }
        }

        if (!cabinetId) {
          console.error('❌ No cabinet found for this subscription update')
          break
        }

        const priceId = subscription.items.data[0]?.price.id
        const tier = PRICE_TO_TIER[priceId] || 'essentiel'
        const quantity = subscription.items.data[0]?.quantity || 1

        // Récupérer le payment method mis à jour
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

        await supabaseAdmin
          .from('cabinets')
          .update({
            subscription_plan: tier,
            subscription_status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            max_members: quantity,
            payment_method_type: paymentMethodType,
            payment_method_last4: paymentMethodLast4,
            payment_method_brand: paymentMethodBrand,
            stripe_subscription_item_id: subscription.items.data[0]?.id,
          })
          .eq('id', cabinetId)

        console.log('✅ Subscription updated:', { cabinetId, tier, quantity, status: subscription.status })
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
