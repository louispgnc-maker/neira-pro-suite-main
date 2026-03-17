-- Script SQL pour synchroniser manuellement une transaction completed
-- Usage: Remplacer 'tx_YMv9ygqXydwL' par l'ID de la transaction

UPDATE signatures
SET 
  status = 'completed',
  signed_at = NOW()
WHERE transaction_id = 'tx_YMv9ygqXydwL'
  OR universign_transaction_id = 'tx_YMv9ygqXydwL';

-- Vérifier la mise à jour
SELECT 
  id, 
  document_name, 
  transaction_id, 
  status, 
  signed_at,
  created_at
FROM signatures
WHERE transaction_id = 'tx_YMv9ygqXydwL'
   OR universign_transaction_id = 'tx_YMv9ygqXydwL';
