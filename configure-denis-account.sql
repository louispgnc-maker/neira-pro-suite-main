-- Configuration du compte de test denis@neira.test
-- Accès: Espace Avocat + Abonnement Cabinet-Plus

-- 1. Mettre à jour le profil (role avocat)
UPDATE public.profiles 
SET 
  role = 'avocat',
  full_name = 'Denis (Compte Test)',
  nom = 'Compte Test',
  prenom = 'Denis'
WHERE email = 'denis@neira.test';

-- 2. Créer ou mettre à jour son cabinet avec Cabinet-Plus
INSERT INTO public.cabinets (
  id,
  owner_id,
  name,
  code,
  subscription_tier,
  subscription_status,
  subscription_started_at,
  max_members,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  id as owner_id,
  'Cabinet Denis (Test)',
  substring(md5(random()::text) from 1 for 8),
  'cabinet-plus',
  'active',
  NOW(),
  NULL, -- Illimité pour cabinet-plus
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'denis@neira.test'
ON CONFLICT (owner_id) 
DO UPDATE SET
  subscription_tier = 'cabinet-plus',
  subscription_status = 'active',
  subscription_started_at = COALESCE(cabinets.subscription_started_at, NOW()),
  max_members = NULL,
  updated_at = NOW();

-- 3. Ajouter l'entrée cabinet_members (fondateur)
INSERT INTO public.cabinet_members (
  id,
  cabinet_id,
  user_id,
  email,
  role,
  status,
  invited_at,
  joined_at
)
SELECT 
  gen_random_uuid(),
  c.id,
  u.id,
  u.email,
  'Fondateur',
  'active',
  NOW(),
  NOW()
FROM auth.users u
JOIN public.cabinets c ON c.owner_id = u.id
WHERE u.email = 'denis@neira.test'
ON CONFLICT (cabinet_id, email) 
DO UPDATE SET
  status = 'active',
  role = 'Fondateur';

-- Vérification
SELECT 
  'Profil' as type,
  p.email,
  p.role,
  p.full_name
FROM public.profiles p
WHERE p.email = 'denis@neira.test'

UNION ALL

SELECT 
  'Cabinet' as type,
  c.name as email,
  c.subscription_tier as role,
  c.subscription_status as full_name
FROM public.cabinets c
JOIN auth.users u ON c.owner_id = u.id
WHERE u.email = 'denis@neira.test'

UNION ALL

SELECT 
  'Membre cabinet' as type,
  cm.email,
  cm.role,
  cm.status as full_name
FROM public.cabinet_members cm
WHERE cm.email = 'denis@neira.test';
