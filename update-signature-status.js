#!/usr/bin/env node

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('ID de transaction Universign (tx_...): ', (transactionId) => {
  const sql = `
-- Mettre à jour le statut de la signature
UPDATE signatures 
SET status = 'signed', 
    signed_at = NOW()
WHERE transaction_id = '${transactionId}' 
   OR universign_transaction_id = '${transactionId}';

-- Vérifier que ça a marché
SELECT id, document_name, status, signed_at 
FROM signatures 
WHERE transaction_id = '${transactionId}' 
   OR universign_transaction_id = '${transactionId}';
`;

  console.log('\n📝 Copie et exécute ce SQL dans Supabase:');
  console.log('https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/sql/new\n');
  console.log(sql);
  
  readline.close();
});
