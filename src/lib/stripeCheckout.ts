import { supabase } from './supabaseClient';

export interface CreateCheckoutSessionParams {
  priceId: string;
  customerEmail?: string;
  cabinetId?: string | null;
  quantity: number; // Nombre de membres
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>; // Pour passer billing_period et autres infos
}

export async function createStripeCheckoutSession(params: CreateCheckoutSessionParams): Promise<string> {
  const startTime = performance.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
      body: params
    });

    const duration = Math.round(performance.now() - startTime);
    console.log(`⌚ Edge function call completed in ${duration}ms`);

    // Vérifier si data contient une erreur (même si error est défini)
    if (data?.error || data?.message) {
      const errorMsg = data.error || data.message;
      const errorType = data.type || data.code || 'unknown';
      console.error('❌ Stripe error:', { errorMsg, errorType, fullData: data });
      throw new Error(`Erreur de paiement: ${errorMsg}`);
    }

    if (error) {
      console.error('❌ Supabase error:', error);
      throw new Error(error.message || 'Impossible de créer la session de paiement');
    }

    if (!data?.url) {
      console.error('❌ No URL returned:', data);
      throw new Error('Aucune URL de paiement retournée');
    }

    console.log(`✅ Checkout URL ready in ${duration}ms`);
    return data.url;
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    console.error(`❌ Failed after ${duration}ms:`, err);
    throw err;
  }
}

export async function createPortalSession(customerId: string, returnUrl?: string): Promise<{ url: string }> {
  const startTime = performance.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('create-portal-session', {
      body: { customerId, returnUrl }
    });

    if (error) {
      console.error('Portal session error:', error);
      throw new Error(error.message || 'Impossible d\'ouvrir le portail de paiement');
    }

    if (!data?.url) {
      throw new Error('Aucune URL de portail retournée');
    }

    const duration = Math.round(performance.now() - startTime);
    console.log(`✅ Portal session ready in ${duration}ms`);
    return { url: data.url };
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    console.error(`❌ Portal failed after ${duration}ms:`, err);
    throw err;
  }
}
