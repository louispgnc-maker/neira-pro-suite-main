-- Rechercher l'utilisateur denis@neira.test
SELECT 
  id,
  email,
  created_at
FROM auth.users 
WHERE email = 'denis@neira.test';

-- Profil
SELECT * FROM public.profiles WHERE email = 'denis@neira.test';

-- Cabinets dont il est membre
SELECT 
  cm.id,
  cm.role,
  cm.status,
  cm.user_id,
  c.name as cabinet_name,
  c.owner_id
FROM public.cabinet_members cm
LEFT JOIN public.cabinets c ON cm.cabinet_id = c.id
WHERE cm.email = 'denis@neira.test';

-- Ses clients (en tant que owner)
SELECT COUNT(*) as nb_clients_propres
FROM public.clients 
WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'denis@neira.test');

-- Ses dossiers
SELECT COUNT(*) as nb_dossiers
FROM public.dossiers 
WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'denis@neira.test');

-- Ses contrats
SELECT COUNT(*) as nb_contrats
FROM public.contrats 
WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'denis@neira.test');
