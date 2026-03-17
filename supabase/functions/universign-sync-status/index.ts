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
    const { signatureId } = await req.json();

    if (!signatureId) {
      return new Response(
        JSON.stringify({ error: 'Signature ID required' }),
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
      .eq('id', signatureId)
      .single();

    if (sigError || !signature) {
      return new Response(
        JSON.stringify({ error: 'Signature not found in database' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transactionId = signature.transaction_id || signature.universign_transaction_id;
    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: 'No transaction ID found' }),
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
    } else if (universignUsername && universignPassword) {
      const credentials = btoa(`${universignUsername}:${universignPassword}`);
      headers['Authorization'] = `Basic ${credentials}`;
    } else {
      return new Response(
        JSON.stringify({ 
          error: 'Universign API credentials not configured',
          details: 'Please set either UNIVERSIGN_API_KEY or UNIVERSIGN_USERNAME + UNIVERSIGN_PASSWORD'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get transaction status from Universign API v1
    const statusEndpoint = `${universignApiUrl}/v1/transactions/${transactionId}`;
    console.log('[Universign Sync] Fetching status from:', statusEndpoint);

    const statusResponse = await fetch(statusEndpoint, {
      method: 'GET',
      headers
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('[Universign Sync] Status check error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get transaction status', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transactionData = await statusResponse.json();
    console.log('[Universign Sync] Transaction data:', JSON.stringify(transactionData, null, 2));

    // Map overall transaction status
    let newStatus = signature.status;
    if (transactionData.state === 'completed' || transactionData.state === 'finished') {
      newStatus = 'completed';
    } else if (transactionData.state === 'canceled' || transactionData.state === 'expired') {
      newStatus = 'cancelled';
    } else if (transactionData.state === 'failed') {
      newStatus = 'failed';
    }

    // Update individual signer statuses
    const updatedSignatories = signature.signatories.map((signer: any) => {
      const participant = transactionData.participants?.find((p: any) => p.email === signer.email);
      if (participant) {
        // If transaction is completed, all participants have signed
        // Otherwise check participant.signed field
        const signerStatus = (transactionData.state === 'completed' || participant.signed === true) ? 'signed' : 'pending';
        console.log(`[Universign Sync] ${signer.email}: state=${transactionData.state}, signed=${participant.signed} -> status=${signerStatus}`);
        return {
          ...signer,
          status: signerStatus
        };
      }
      return {
        ...signer,
        status: transactionData.state === 'completed' ? 'signed' : 'pending'
      };
    });

    // Update signature in database
    const updateData: any = {
      status: newStatus,
      signatories: updatedSignatories
    };

    if (newStatus === 'completed') {
      updateData.signed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('signatures')
      .update(updateData)
      .eq('id', signature.id);

    if (updateError) {
      console.error('[Universign Sync] Database update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update signature', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        status: newStatus,
        signatories: updatedSignatories.map(s => ({ email: s.email, status: s.status })),
        transactionState: transactionData.state
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Universign Sync] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
