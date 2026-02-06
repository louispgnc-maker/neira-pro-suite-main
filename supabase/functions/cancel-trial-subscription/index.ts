import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { cabinetId } = await req.json();

    if (!cabinetId) {
      return new Response(
        JSON.stringify({ error: 'Cabinet ID manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔴 Annulation de l\'abonnement pour le cabinet:', cabinetId);

    // Vérifier que l'utilisateur est bien Fondateur du cabinet
    const { data: memberData, error: memberError } = await supabaseClient
      .from('cabinet_members')
      .select('role_cabinet')
      .eq('cabinet_id', cabinetId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !memberData || memberData.role_cabinet !== 'Fondateur') {
      return new Response(
        JSON.stringify({ error: 'Seul le Fondateur peut annuler l\'abonnement' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer l'ID de l'abonnement Stripe
    const { data: cabinetData, error: cabinetError } = await supabaseClient
      .from('cabinets')
      .select('stripe_subscription_id, subscription_status')
      .eq('id', cabinetId)
      .single();

    if (cabinetError || !cabinetData) {
      return new Response(
        JSON.stringify({ error: 'Cabinet non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que l'abonnement est bien en période d'essai
    if (cabinetData.subscription_status !== 'trial' && cabinetData.subscription_status !== 'trialing') {
      return new Response(
        JSON.stringify({ error: 'Cette action n\'est disponible que pendant la période d\'essai' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Annuler l'abonnement Stripe
    if (cabinetData.stripe_subscription_id) {
      console.log('📧 Annulation de l\'abonnement Stripe:', cabinetData.stripe_subscription_id);
      
      try {
        await stripe.subscriptions.cancel(cabinetData.stripe_subscription_id);
        console.log('✅ Abonnement Stripe annulé');
      } catch (stripeError: any) {
        console.error('❌ Erreur Stripe:', stripeError);
        // Continuer même si Stripe échoue (l'abonnement n'a peut-être pas encore été créé)
      }
    }

    // Supprimer le cabinet et ses données
    console.log('🗑️ Suppression des données du cabinet...');
    
    // Supprimer d'abord les membres du cabinet
    await supabaseClient
      .from('cabinet_members')
      .delete()
      .eq('cabinet_id', cabinetId);

    // Supprimer le cabinet
    await supabaseClient
      .from('cabinets')
      .delete()
      .eq('id', cabinetId);

    // Supprimer le profil de l'utilisateur
    await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', user.id);

    // Supprimer l'utilisateur de auth.users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    if (deleteUserError) {
      console.error('❌ Erreur lors de la suppression de l\'utilisateur:', deleteUserError);
    } else {
      console.log('✅ Utilisateur supprimé');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Abonnement annulé et compte supprimé avec succès' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
