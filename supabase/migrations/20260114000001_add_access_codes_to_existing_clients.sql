-- Migration pour attribuer des codes d'accès aux clients existants sans code

-- Fonction pour générer un code d'accès aléatoire de 6 caractères
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TEXT AS $$
DECLARE
  characters TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Créer des invitations avec codes d'accès pour tous les clients qui n'en ont pas
INSERT INTO client_invitations (client_id, email, token, access_code, expires_at, status)
SELECT 
  c.id,
  COALESCE(c.email, ''),
  gen_random_uuid(),
  generate_access_code(),
  NOW() + INTERVAL '720 hours', -- 30 jours
  'pending'
FROM clients c
LEFT JOIN client_invitations ci ON ci.client_id = c.id
WHERE ci.id IS NULL; -- Seulement les clients sans invitation

-- Supprimer la fonction temporaire
DROP FUNCTION IF EXISTS generate_access_code();
