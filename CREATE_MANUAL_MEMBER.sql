-- Créer manuellement le cabinet_member pour contact@neira.fr
-- Remplace <TON_USER_ID> par ton vrai user ID

-- D'abord, trouve ton user_id
SELECT id, email FROM auth.users WHERE email = 'contact@neira.fr';

-- Ensuite, insère le cabinet_member (remplace <TON_USER_ID> par l'ID trouvé ci-dessus)
INSERT INTO cabinet_members (
  cabinet_id,
  user_id,
  email,
  nom,
  status,
  joined_at,
  created_at
)
VALUES (
  '1f479030-cfa8-48c6-bfc0-526af16f608f',  -- cabinet_id du cabinet avec code D8771447
  '<TON_USER_ID>',  -- REMPLACE PAR TON USER ID
  'contact@neira.fr',
  'Contact Neira',
  'active',
  NOW(),
  NOW()
);
