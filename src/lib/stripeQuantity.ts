import { supabase } from './supabaseClient';

/**
 * Met à jour la quantity de l'abonnement Stripe quand des membres sont ajoutés/supprimés
 * À appeler après avoir modifié les membres du cabinet
 */
export async function updateSubscriptionQuantity(cabinetId: string): Promise<void> {
  try {
    // 1. Récupérer les infos du cabinet
    const { data: cabinet, error: cabinetError } = await supabase
      .from('cabinets')
      .select('stripe_subscription_item_id, subscription_status')
      .eq('id', cabinetId)
      .single();

    if (cabinetError) throw cabinetError;

    if (!cabinet.stripe_subscription_item_id) {
      console.log('Pas d\'abonnement Stripe pour ce cabinet');
      return;
    }

    if (cabinet.subscription_status !== 'active') {
      console.log('Abonnement non actif, pas de mise à jour');
      return;
    }

    // 2. Compter les membres actifs
    const { count, error: countError } = await supabase
      .from('cabinet_members')
      .select('*', { count: 'exact', head: true })
      .eq('cabinet_id', cabinetId)
      .in('status', ['active', 'inactive']);

    if (countError) throw countError;

    const quantity = Math.max(count || 1, 1); // Au moins 1 membre

    // 3. Appeler l'Edge Function pour mettre à jour Stripe
    const { data, error } = await supabase.functions.invoke('update-subscription-quantity', {
      body: {
        subscriptionItemId: cabinet.stripe_subscription_item_id,
        quantity,
      },
    });

    if (error) throw error;

    console.log('✅ Quantity Stripe mise à jour:', quantity);
  } catch (error) {
    console.error('❌ Erreur mise à jour quantity:', error);
    throw error;
  }
}
