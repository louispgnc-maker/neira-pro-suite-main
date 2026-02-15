-- Nettoyer les doublons dans cabinet_documents
-- Garder seulement la première occurrence de chaque document_id

-- 1. Supprimer les doublons (garder l'ID le plus récent pour chaque document_id)
DELETE FROM cabinet_documents
WHERE id IN (
  SELECT cd.id
  FROM cabinet_documents cd
  INNER JOIN (
    SELECT document_id, MAX(id) as keep_id
    FROM cabinet_documents
    WHERE cabinet_id = '1f479030-cfa8-48c6-bfcb-5264f16f608f'
    GROUP BY document_id
  ) keep ON cd.document_id = keep.document_id
  WHERE cd.cabinet_id = '1f479030-cfa8-48c6-bfcb-5264f16f608f'
    AND cd.id != keep.keep_id
);

-- 2. Vérifier le résultat
SELECT 
  'Documents uniques' as type, 
  COUNT(DISTINCT document_id) as count 
FROM cabinet_documents 
WHERE cabinet_id = '1f479030-cfa8-48c6-bfcb-5264f16f608f'

UNION ALL

SELECT 
  'Total lignes', 
  COUNT(*) 
FROM cabinet_documents 
WHERE cabinet_id = '1f479030-cfa8-48c6-bfcb-5264f16f608f';
