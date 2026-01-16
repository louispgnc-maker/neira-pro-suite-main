-- Script pour créer un compte client de test avec son professionnel
-- À exécuter dans le SQL Editor de Supabase

-- 1. Créer un utilisateur de test pour le client dans auth.users
-- Email: test.client@neira.fr
-- Mot de passe: TestClient123!
-- Note: Vous devez créer cet utilisateur via l'interface Supabase Auth ou via l'API

-- 2. Récupérer l'ID du cabinet de test (supposons qu'il existe déjà)
-- Si vous n'avez pas de cabinet, créez-en un d'abord via l'interface

-- Pour ce script, nous allons utiliser votre cabinet existant
-- Remplacez USER_ID_DU_PRO par votre user_id

DO $$
DECLARE
  v_cabinet_id uuid;
  v_client_id uuid;
  v_access_code text := 'TEST01'; -- Code d'accès simple pour test
BEGIN
  -- Récupérer le premier cabinet avocat (vous pouvez changer pour notaire)
  SELECT id INTO v_cabinet_id
  FROM cabinets
  WHERE role = 'avocat'
  LIMIT 1;

  IF v_cabinet_id IS NULL THEN
    RAISE EXCEPTION 'Aucun cabinet trouvé. Créez d''abord un cabinet professionnel.';
  END IF;

  -- Récupérer l'owner_id du cabinet
  DECLARE
    v_owner_id uuid;
  BEGIN
    SELECT owner_id INTO v_owner_id FROM cabinets WHERE id = v_cabinet_id;

    -- Créer le client
    INSERT INTO clients (
      owner_id,
      role,
      nom,
      prenom,
      email,
      telephone,
      adresse,
      date_naissance,
      sexe,
      kyc_status,
      source,
      consentement_rgpd,
      created_at
    ) VALUES (
      v_owner_id,
      'avocat',
      'Dupont',
      'Marie',
      'test.client@neira.fr',
      '06 12 34 56 78',
      '123 Rue de Test, 75001 Paris',
      '1990-05-15',
      'F',
      'Valide',
      'manual',
      true,
      NOW()
    )
    RETURNING id INTO v_client_id;

    -- Créer l'invitation client avec le code d'accès
    INSERT INTO client_invitations (
      client_id,
      cabinet_id,
      email,
      access_code,
      status,
      created_at
    ) VALUES (
      v_client_id,
      v_cabinet_id,
      'test.client@neira.fr',
      v_access_code,
      'pending', -- Changera à 'active' quand le client créera son compte
      NOW()
    );

    -- Lier le client au cabinet
    INSERT INTO cabinet_clients (
      cabinet_id,
      client_id,
      created_at
    ) VALUES (
      v_cabinet_id,
      v_client_id,
      NOW()
    );

    RAISE NOTICE '✅ Client créé avec succès!';
    RAISE NOTICE 'ID Client: %', v_client_id;
    RAISE NOTICE 'ID Cabinet: %', v_cabinet_id;
    RAISE NOTICE 'Email: test.client@neira.fr';
    RAISE NOTICE 'Code d''accès: %', v_access_code;
    RAISE NOTICE '';
    RAISE NOTICE '🔑 ÉTAPES SUIVANTES:';
    RAISE NOTICE '1. Allez sur votre site /client-login';
    RAISE NOTICE '2. Cliquez sur "Créer mon compte"';
    RAISE NOTICE '3. Entrez le code: %', v_access_code;
    RAISE NOTICE '4. Email: test.client@neira.fr';
    RAISE NOTICE '5. Créez un mot de passe (min 8 caractères)';
  END;
END $$;
