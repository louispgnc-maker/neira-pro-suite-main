-- Vérifier que la fonction create_cabinet existe
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'create_cabinet';

-- Afficher la définition de la fonction
SELECT pg_get_functiondef('public.create_cabinet'::regproc);
