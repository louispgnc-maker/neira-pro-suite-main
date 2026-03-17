#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const universignApiUrl = process.env.UNIVERSIGN_API_URL || 'https://api.alpha.universign.com';
const universignApiKey = process.env.UNIVERSIGN_API_KEY;
const universignUsername = process.env.UNIVERSIGN_USERNAME;
const universignPassword = process.env.UNIVERSIGN_PASSWORD;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

if (!universignApiKey && (!universignUsername || !universignPassword)) {
  console.error('❌ Missing Universign credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Prepare auth headers
const headers = {};
if (universignApiKey) {
  headers['Authorization'] = `Bearer ${universignApiKey}`;
  console.log('🔑 Using API Key authentication');
} else {
  const credentials = Buffer.from(`${universignUsername}:${universignPassword}`).toString('base64');
  headers['Authorization'] = `Basic ${credentials}`;
  console.log('🔑 Using Basic authentication');
}

async function syncSignatureStatus() {
  console.log('\n🔄 Fetching pending signatures...');
  
  const { data: signatures, error } = await supabase
    .from('signatures')
    .select('id, transaction_id, universign_transaction_id, status, document_name')
    .eq('status', 'pending')
    .not('transaction_id', 'is', null);

  if (error) {
    console.error('❌ Error fetching signatures:', error);
    return;
  }

  console.log(`📋 Found ${signatures.length} pending signatures\n`);

  for (const sig of signatures) {
    const transactionId = sig.transaction_id || sig.universign_transaction_id;
    console.log(`\n🔍 Checking ${sig.document_name} (${transactionId})...`);

    try {
      const response = await fetch(`${universignApiUrl}/v1/transactions/${transactionId}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        console.error(`  ❌ Failed to fetch (${response.status})`);
        continue;
      }

      const txData = await response.json();
      console.log(`  📊 Universign status: ${txData.state}`);

      // Map Universign state to our status
      let newStatus = 'pending';
      let signedCount = 0;

      if (txData.state === 'completed' || txData.state === 'finished') {
        newStatus = 'completed';
        // Count all participants for completed transactions
        if (txData.participants) {
          signedCount = txData.participants.length;
        }
      } else if (txData.state === 'canceled' || txData.state === 'expired') {
        newStatus = 'cancelled';
        // Count only who signed before cancellation
        if (txData.participants) {
          signedCount = txData.participants.filter(p => p.signed === true).length;
        }
      } else if (txData.state === 'failed') {
        newStatus = 'failed';
      } else {
        console.log(`  ℹ️  Still pending, no update needed`);
        continue;
      }

      // Update database
      const updateData = {
        status: newStatus,
      };

      if (newStatus === 'completed') {
        updateData.signed_at = new Date().toISOString();
      }

      if (newStatus === 'cancelled' || newStatus === 'closed') {
        updateData.signed_count = signedCount;
        updateData.closed_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('signatures')
        .update(updateData)
        .eq('id', sig.id);

      if (updateError) {
        console.error(`  ❌ Update error:`, updateError);
      } else {
        console.log(`  ✅ Updated to: ${newStatus} (signed count: ${signedCount || 'N/A'})`);
      }

    } catch (err) {
      console.error(`  ❌ Error:`, err.message);
    }
  }

  console.log('\n✨ Sync complete!\n');
}

syncSignatureStatus();
