-- Créer l'entrée client pour louispoignonec@essca.eu
DO $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Récupérer le user_id
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'louispoignonec@essca.eu';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Insérer le client
    INSERT INTO clients (
        id,
        user_id,
        nom,
        prenom,
        email,
        telephone,
        source,
        created_at,
        updated_at
    ) VALUES (
        '201f03a0-f199-467a-9300-e9712d6aa2f5'::uuid,
        v_user_id,
        'Poignonec',
        'Louis',
        'louispoignonec@essca.eu',
        NULL,
        'manuel',
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        user_id = v_user_id,
        updated_at = NOW();
    
    RAISE NOTICE 'Client créé avec user_id: %', v_user_id;
END $$;
