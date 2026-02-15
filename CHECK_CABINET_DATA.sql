-- Vérifier si les tables cabinet ont des données

SELECT 
  (SELECT COUNT(*) FROM cabinet_dossiers WHERE cabinet_id = '1f479030-cfa8-48c6-bfc0-526af16f608f') as dossiers_count,
  (SELECT COUNT(*) FROM cabinet_clients WHERE cabinet_id = '1f479030-cfa8-48c6-bfc0-526af16f608f') as clients_count,
  (SELECT COUNT(*) FROM cabinet_documents WHERE cabinet_id = '1f479030-cfa8-48c6-bfc0-526af16f608f') as documents_count,
  (SELECT COUNT(*) FROM cabinet_contrats WHERE cabinet_id = '1f479030-cfa8-48c6-bfc0-526af16f608f') as contrats_count;
