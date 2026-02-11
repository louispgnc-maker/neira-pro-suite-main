-- Récupérer les informations d'abonnement pour contact@neira.fr

-- Trouver l'utilisateur
SELECT 
  'USER INFO' as type,
  u.id as user_id,
  u.email,
  u.created_at
FROM auth.users u
WHERE u.email = 'contact@neira.fr';

-- Trouver le cabinet de cet utilisateur
SELECT 
  'CABINET INFO' as type,
  c.id as cabinet_id,
  c.nom,
  c.subscription_plan,
  c.subscription_status,
  c.max_members,
  c.stripe_subscription_id,
  c.stripe_customer_id,
  c.current_period_end,
  c.billing_period,
  c.role as cabinet_type
FROM cabinets c
JOIN auth.users u ON c.owner_id = u.id OR EXISTS (
  SELECT 1 FROM cabinet_members cm 
  WHERE cm.cabinet_id = c.id 
  AND cm.user_id = u.id
)
WHERE u.email = 'contact@neira.fr'
LIMIT 1;

-- Trouver le rôle de cet utilisateur dans le cabinet
SELECT 
  'MEMBER ROLE' as type,
  cm.role_cabinet,
  cm.status,
  cm.joined_at
FROM cabinet_members cm
JOIN auth.users u ON cm.user_id = u.id
WHERE u.email = 'contact@neira.fr';
