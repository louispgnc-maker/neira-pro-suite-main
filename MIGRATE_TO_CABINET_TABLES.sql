-- Migration des données personnelles vers les tables cabinet
-- Pour le cabinet: 1f479030-cfa8-48c6-bfcb-5264f16f608f

-- Membres du cabinet
-- contact@neira.fr: e3fd28ea-83bc-49be-8a6e-26c6c4a2cf0b
-- louis.poignonec@essca.eu: 7aa5fa13-9c3c-4aba-ad80-f9ceef069a9c
-- louispgnc@gmail.com: 5e1dd652-dfa4-4438-ad31-0930652e6da9

-- 1. Migrer les CLIENTS vers cabinet_clients
INSERT INTO cabinet_clients (
  id,
  cabinet_id,
  client_id,
  shared_by,
  shared_at,
  created_at,
  updated_at,
  nom,
  prenom,
  email,
  telephone,
  kyc_status,
  missing_info
)
SELECT 
  gen_random_uuid() as id,
  '1f479030-cfa8-48c6-bfcb-5264f16f608f' as cabinet_id,
  c.id as client_id,
  c.owner_id as shared_by,
  NOW() as shared_at,
  c.created_at,
  NOW() as updated_at,
  c.nom,
  c.prenom,
  c.email,
  c.telephone,
  c.kyc_status,
  c.missing_info
FROM clients c
WHERE c.owner_id IN (
  'e3fd28ea-83bc-49be-8a6e-26c6c4a2cf0b',
  '7aa5fa13-9c3c-4aba-ad80-f9ceef069a9c',
  '5e1dd652-dfa4-4438-ad31-0930652e6da9'
);

-- 2. Migrer les DOSSIERS vers cabinet_dossiers
INSERT INTO cabinet_dossiers (
  id,
  cabinet_id,
  dossier_id,
  title,
  description,
  status,
  client_name,
  shared_by,
  shared_at,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as id,
  '1f479030-cfa8-48c6-bfcb-5264f16f608f' as cabinet_id,
  d.id as dossier_id,
  d.title,
  d.description,
  d.status,
  (SELECT c.nom || ' ' || c.prenom FROM clients c WHERE c.id = d.client_id) as client_name,
  d.owner_id as shared_by,
  NOW() as shared_at,
  d.created_at,
  d.updated_at
FROM dossiers d
WHERE d.owner_id IN (
  'e3fd28ea-83bc-49be-8a6e-26c6c4a2cf0b',
  '7aa5fa13-9c3c-4aba-ad80-f9ceef069a9c',
  '5e1dd652-dfa4-4438-ad31-0930652e6da9'
);

-- 3. Migrer les DOCUMENTS vers cabinet_documents
INSERT INTO cabinet_documents (
  id,
  cabinet_id,
  document_id,
  title,
  file_name,
  shared_by,
  shared_at,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as id,
  '1f479030-cfa8-48c6-bfcb-5264f16f608f' as cabinet_id,
  d.id as document_id,
  d.name as title,
  d.name as file_name,
  d.owner_id as shared_by,
  NOW() as shared_at,
  NOW() as created_at,
  d.updated_at
FROM documents d
WHERE d.owner_id IN (
  'e3fd28ea-83bc-49be-8a6e-26c6c4a2cf0b',
  '7aa5fa13-9c3c-4aba-ad80-f9ceef069a9c',
  '5e1dd652-dfa4-4438-ad31-0930652e6da9'
);

-- 4. Vérifier les résultats
SELECT 'Clients migrés:' as table_name, COUNT(*) as count FROM cabinet_clients WHERE cabinet_id = '1f479030-cfa8-48c6-bfcb-5264f16f608f'
UNION ALL
SELECT 'Dossiers migrés:', COUNT(*) FROM cabinet_dossiers WHERE cabinet_id = '1f479030-cfa8-48c6-bfcb-5264f16f608f'
UNION ALL
SELECT 'Documents migrés:', COUNT(*) FROM cabinet_documents WHERE cabinet_id = '1f479030-cfa8-48c6-bfcb-5264f16f608f';
