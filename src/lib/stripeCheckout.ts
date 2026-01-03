import { supabase } from './supabaseClient';

export interface CreateCheckoutSessionParams {
  priceId: string;
  customerEmail?: string;
  cabinetId?: string | null;
  quantity: number; // Nombre de membres
  successUrl?: string;
  cancelUrl?: string;
}

export async function createStripeCheckoutSession(params: CreateCheckoutSessionParams): Promise<string> {
  console.log('Calling create-subscription-checkout with params:', params);
  
  const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
    body: params
  });

  console.log('Response data:', data);
  console.log('Response error:', error);

  if (error) {
    console.error('Error creating checkout session:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(error.message || 'Failed to create checkout session');
  }

  if (data?.error) {
    console.error('Stripe error:', data.error);
    console.error('Stripe error details:', data.details);
    throw new Error(data.error);
  }

  if (!data?.url) {
    console.error('No URL in response:', data);
    throw new Error('No checkout URL returned');
  }

  return data.url;
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
