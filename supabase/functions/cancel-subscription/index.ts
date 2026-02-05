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
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Créer le client Supabase avec le JWT de l'utilisateur
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Non authentifié')
    }

    const { cabinetId } = await req.json()

    if (!cabinetId) {
      throw new Error('Cabinet ID requis')
    }

    console.log('Cancel subscription request:', { userId: user.id, cabinetId })

    // Vérifier que l'utilisateur est bien membre du cabinet
    const { data: memberData, error: memberError } = await supabaseClient
      .from('cabinet_members')
      .select('role')
      .eq('cabinet_id', cabinetId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !memberData) {
      throw new Error('Vous n\'êtes pas membre de ce cabinet')
    }

    // Vérifier que l'utilisateur est manager ou owner
    if (memberData.role !== 'manager' && memberData.role !== 'owner') {
      throw new Error('Seuls les managers et owners peuvent annuler l\'abonnement')
    }

    // Récupérer les informations du cabinet
    const { data: cabinetData, error: cabinetError } = await supabaseClient
      .from('cabinets')
      .select('stripe_subscription_id, subscription_commitment_end_date, billing_period')
      .eq('id', cabinetId)
      .single()

    if (cabinetError || !cabinetData) {
      throw new Error('Cabinet non trouvé')
    }

    if (!cabinetData.stripe_subscription_id) {
      throw new Error('Aucun abonnement actif')
    }

    // 🔒 VÉRIFICATION ENGAGEMENT 12 MOIS
    const commitmentEndDate = new Date(cabinetData.subscription_commitment_end_date)
    const now = new Date()

    if (now < commitmentEndDate) {
      const remainingMonths = Math.ceil((commitmentEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30))
      const commitmentEndStr = commitmentEndDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      
      return new Response(
        JSON.stringify({
          error: 'engagement_not_completed',
          message: `Vous êtes encore sous engagement jusqu'au ${commitmentEndStr} (environ ${remainingMonths} mois restants). L'annulation n'est pas autorisée pendant cette période.`,
          commitmentEndDate: cabinetData.subscription_commitment_end_date,
          remainingMonths,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Si on arrive ici, l'engagement est terminé, on peut annuler
    console.log('Cancelling subscription:', cabinetData.stripe_subscription_id)

    // Annuler l'abonnement Stripe (à la fin de la période en cours)
    const subscription = await stripe.subscriptions.update(
      cabinetData.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    )

    console.log('Subscription cancelled successfully:', {
      id: subscription.id,
      cancel_at: subscription.cancel_at,
      cancel_at_period_end: subscription.cancel_at_period_end,
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Votre abonnement sera annulé à la fin de la période en cours',
        cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('Error cancelling subscription:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Erreur lors de l\'annulation',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
