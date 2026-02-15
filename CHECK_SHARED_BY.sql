-- Vérifier le shared_by des documents cabinet

SELECT 
  id,
  cabinet_id,
  shared_by,
  shared_at
FROM cabinet_documents
WHERE cabinet_id = '1f479030-cfa8-48c6-bfc0-526af16f608f'
LIMIT 5;

-- Voir tous les shared_by distincts
SELECT DISTINCT shared_by, COUNT(*) as count
FROM cabinet_documents
WHERE cabinet_id = '1f479030-cfa8-48c6-bfc0-526af16f608f'
GROUP BY shared_by;
