-- Migration pour convertir les statuts de l'anglais au français
-- Date: 2024

-- Mettre à jour les statuts principaux des signatures
UPDATE signatures 
SET status = CASE 
  WHEN status = 'pending' THEN 'en_attente'
  WHEN status = 'completed' THEN 'signee'
  WHEN status = 'signed' THEN 'signee'
  WHEN status = 'cancelled' THEN 'annulee'
  WHEN status = 'closed' THEN 'fermee'
  WHEN status = 'failed' THEN 'echec'
  ELSE status
END
WHERE status IN ('pending', 'completed', 'signed', 'cancelled', 'closed', 'failed');

-- Mettre à jour les statuts des signataires dans le JSON
UPDATE signatures 
SET signatories = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem->>'status' = 'signed' THEN jsonb_set(elem, '{status}', '"signe"')
      WHEN elem->>'status' = 'pending' THEN jsonb_set(elem, '{status}', '"en_attente"')
      WHEN elem->>'status' = 'completed' THEN jsonb_set(elem, '{status}', '"signe"')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(signatories) elem
)
WHERE signatories IS NOT NULL
AND EXISTS (
  SELECT 1 
  FROM jsonb_array_elements(signatories) elem 
  WHERE elem->>'status' IN ('signed', 'pending', 'completed')
);

-- Vérifier les résultats
SELECT 
  status,
  COUNT(*) as count
FROM signatures
GROUP BY status
ORDER BY count DESC;
