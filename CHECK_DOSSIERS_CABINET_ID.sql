-- Vérifier la structure des dossiers et leurs cabinet_id
SELECT 
  id,
  titre,
  cabinet_id,
  client_id,
  status
FROM public.client_dossiers_new
LIMIT 10;

-- Vérifier si le cabinet_id est null
SELECT 
  COUNT(*) as total_dossiers,
  COUNT(cabinet_id) as avec_cabinet_id,
  COUNT(*) - COUNT(cabinet_id) as sans_cabinet_id
FROM public.client_dossiers_new;
