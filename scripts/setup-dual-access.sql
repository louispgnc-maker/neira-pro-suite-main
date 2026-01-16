-- Script pour permettre à louispoignonec@essca.eu d'avoir accès pro ET client
-- Ce compte pourra accéder aux deux espaces grâce à l'exception dans RoleProtectedRoute

-- 1. Créer le cabinet avec un UUID fixe pour le owner_id
-- On utilise l'ID de l'invitation existante comme cabinet_id temporaire
INSERT INTO cabinets (
  id,
  role,
  nom,
  adresse,
  owner_id
) VALUES (
  '201f03a0-f199-467a-9300-e9712d6aa2f5', -- ID du cabinet = ID de l'invitation client
  'avocat',
  'Cabinet Test - Louis Poignonec',
  'Adresse test',
  '201f03a0-f199-467a-9300-e9712d6aa2f5' -- owner_id = id du cabinet (self-reference temporaire)
)
ON CONFLICT (id) DO NOTHING;

-- 2. Créer l'entrée client avec ce cabinet comme owner
INSERT INTO clients (
  id,
  owner_id,
  name,
  nom,
  prenom,
  email,
  source,
  role
) VALUES (
  gen_random_uuid(),
  '201f03a0-f199-467a-9300-e9712d6aa2f5', -- Référence au cabinet créé ci-dessus
  'Louis Poignonec',
  'Poignonec',
  'Louis',
  'louispoignonec@essca.eu',
  'manuel',
  'avocat'
)
ON CONFLICT DO NOTHING
RETURNING id, nom, prenom, email;
