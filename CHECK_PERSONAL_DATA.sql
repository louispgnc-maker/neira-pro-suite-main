-- Vérifier les données personnelles des membres

SELECT 
  (SELECT COUNT(*) FROM dossiers WHERE owner_id IN (
    SELECT user_id FROM cabinet_members WHERE cabinet_id = '1f479030-cfa8-48c6-bfc0-526af16f608f'
  )) as dossiers_perso_count,
  
  (SELECT COUNT(*) FROM clients WHERE owner_id IN (
    SELECT user_id FROM cabinet_members WHERE cabinet_id = '1f479030-cfa8-48c6-bfc0-526af16f608f'
  )) as clients_perso_count,
  
  (SELECT COUNT(*) FROM documents WHERE owner_id IN (
    SELECT user_id FROM cabinet_members WHERE cabinet_id = '1f479030-cfa8-48c6-bfc0-526af16f608f'
  )) as documents_perso_count;
