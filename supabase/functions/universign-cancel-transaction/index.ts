import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { transactionId } = await req.json();

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: 'Transaction ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get signature info from database
    const { data: signature, error: sigError } = await supabase
      .from('signatures')
      .select('*')
      .eq('universign_transaction_id', transactionId)
      .single();

    if (sigError || !signature) {
      return new Response(
        JSON.stringify({ error: 'Signature not found in database' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if signature can be cancelled
    if (signature.status === 'completed') {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot cancel completed signature',
          status: signature.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (signature.status === 'cancelled') {
      return new Response(
        JSON.stringify({ 
          error: 'Signature already cancelled',
          status: signature.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Universign API credentials
    const universignApiUrl = Deno.env.get('UNIVERSIGN_API_URL') || 'https://api.alpha.universign.com';
    const universignApiKey = Deno.env.get('UNIVERSIGN_API_KEY');
    const universignUsername = Deno.env.get('UNIVERSIGN_USERNAME');
    const universignPassword = Deno.env.get('UNIVERSIGN_PASSWORD');

    // Prepare authentication header
    const headers: Record<string, string> = {};
    
    if (universignApiKey) {
      headers['Authorization'] = `Bearer ${universignApiKey}`;
      console.log('[Universign] Using API Key authentication');
    } else if (universignUsername && universignPassword) {
      const credentials = btoa(`${universignUsername}:${universignPassword}`);
      headers['Authorization'] = `Basic ${credentials}`;
      console.log('[Universign] Using Basic authentication');
    } else {
      return new Response(
        JSON.stringify({ 
          error: 'Universign API credentials not configured',
          details: 'Please set either UNIVERSIGN_API_KEY or UNIVERSIGN_USERNAME + UNIVERSIGN_PASSWORD'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cancel transaction on Universign
    const cancelEndpoint = `${universignApiUrl}/v1/transactions/${transactionId}/cancel`;
    console.log('[Universign] Cancelling transaction:', cancelEndpoint);

    const cancelResponse = await fetch(cancelEndpoint, {
      method: 'POST',
      headers
    });

    if (!cancelResponse.ok) {
      const errorText = await cancelResponse.text();
      console.error('[Universign] Cancel error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to cancel transaction', 
          status: cancelResponse.status,
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await cancelResponse.json();
    console.log('[Universign] Transaction cancelled successfully:', result);

    // Update signature status in database
    const { error: updateError } = await supabase
      .from('signatures')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', signature.id);

    if (updateError) {
      console.error('[Universign] Failed to update signature status:', updateError);
      // Don't fail the request, transaction is already cancelled on Universign
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        transactionId: transactionId,
        message: 'Transaction cancelled successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Universign] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
