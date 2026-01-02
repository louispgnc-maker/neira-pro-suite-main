import { supabase } from './supabaseClient';

export interface CreateCheckoutSessionParams {
  priceId: string;
  customerEmail: string;
  cabinetId: string;
  quantity: number; // Nombre de membres
  successUrl?: string;
  cancelUrl?: string;
}

export async function createStripeCheckoutSession(params: CreateCheckoutSessionParams): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
    body: params
  });

  if (error) {
    console.error('Error creating checkout session:', error);
    throw new Error(error.message || 'Failed to create checkout session');
  }

  if (!data?.url) {
    throw new Error('No checkout URL returned');
  }

  return { url: data.url };
}

export async function createPortalSession(customerId: string, returnUrl?: string): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke('create-portal-session', {
    body: { customerId, returnUrl }
  });

  if (error) {
    console.error('Error creating portal session:', error);
    throw new Error(error.message || 'Failed to create portal session');
  }

  if (!data?.url) {
    throw new Error('No portal URL returned');
  }

  return { url: data.url };
}
