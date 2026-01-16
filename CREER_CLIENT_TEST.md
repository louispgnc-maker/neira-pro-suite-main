# INSTRUCTIONS POUR CRÉER UN CLIENT DE TEST

## Méthode 1 : Via le SQL Editor de Supabase (RECOMMANDÉ)

1. **Connectez-vous à votre dashboard Supabase**
   - Allez sur https://supabase.com/dashboard

2. **Ouvrez le SQL Editor**
   - Cliquez sur "SQL Editor" dans le menu de gauche

3. **Copiez et exécutez ce script SQL :**

```sql
-- Créer un client de test lié à votre cabinet
DO $$
DECLARE
  v_cabinet_id uuid;
  v_client_id uuid;
  v_access_code text := 'ABC123'; -- Code simple pour test
BEGIN
  -- Récupérer VOTRE cabinet (le premier trouvé)
  SELECT id INTO v_cabinet_id
  FROM cabinets
  WHERE role = 'avocat'  -- ou 'notaire' selon votre compte
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_cabinet_id IS NULL THEN
    RAISE EXCEPTION 'Aucun cabinet trouvé. Connectez-vous d''abord avec votre compte professionnel.';
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
      consentement_rgpd
    ) VALUES (
      v_owner_id,
      'avocat',  -- ou 'notaire' selon votre compte
      'Martin',
      'Sophie',
      'sophie.martin.test@example.com',
      '06 12 34 56 78',
      '456 Avenue de Test, 75002 Paris',
      '1985-03-20',
      'F',
      'Valide',
      'manual',
      true
    )
    RETURNING id INTO v_client_id;

    -- Créer l'invitation avec le code d'accès
    INSERT INTO client_invitations (
      client_id,
      cabinet_id,
      email,
      access_code,
      status
    ) VALUES (
      v_client_id,
      v_cabinet_id,
      'sophie.martin.test@example.com',
      v_access_code,
      'pending'
    );

    -- Lier le client au cabinet
    INSERT INTO cabinet_clients (
      cabinet_id,
      client_id
    ) VALUES (
      v_cabinet_id,
      v_client_id
    );

    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE '✅ CLIENT DE TEST CRÉÉ!';
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📧 Email: sophie.martin.test@example.com';
    RAISE NOTICE '🔑 Code d''accès: %', v_access_code;
    RAISE NOTICE '';
    RAISE NOTICE 'ÉTAPES SUIVANTES:';
    RAISE NOTICE '1. Allez sur /client-login';
    RAISE NOTICE '2. Cliquez "Créer mon compte"';
    RAISE NOTICE '3. Entrez le code: %', v_access_code;
    RAISE NOTICE '4. Email: sophie.martin.test@example.com';
    RAISE NOTICE '5. Créez un mot de passe';
  END;
END $$;
```

4. **Cliquez sur "Run" pour exécuter**

5. **Notez les informations affichées :**
   - Email : `sophie.martin.test@example.com`
   - Code d'accès : `ABC123`

---

## Méthode 2 : Utiliser un client existant

Si vous avez déjà créé des clients via l'interface :

1. **Allez dans Table Editor → `clients`**
2. **Sélectionnez un client**
3. **Notez son `id` et son `email`**

4. **Créez une invitation pour ce client :**

```sql
-- Remplacez CLIENT_ID par l'ID du client
-- Remplacez VOTRE_CABINET_ID par l'ID de votre cabinet

INSERT INTO client_invitations (
  client_id,
  cabinet_id,
  email,
  access_code,
  status
) VALUES (
  'CLIENT_ID',
  'VOTRE_CABINET_ID',
  'email_du_client@example.com',
  'TEST99',
  'pending'
);

-- Lier au cabinet
INSERT INTO cabinet_clients (cabinet_id, client_id)
VALUES ('VOTRE_CABINET_ID', 'CLIENT_ID');
```

---

## SE CONNECTER ENSUITE

Une fois le client créé :

1. **Allez sur votre site : `/client-login`**

2. **Cliquez sur "Créer mon compte"**

3. **Remplissez le formulaire :**
   - Code d'accès : `ABC123` (ou le code que vous avez défini)
   - Email : `sophie.martin.test@example.com`
   - Mot de passe : (créez-en un, minimum 8 caractères)

4. **Le compte sera créé et lié automatiquement**

5. **Vous pourrez alors :**
   - Uploader des documents
   - Les voir apparaître sur la fiche client du professionnel
   - Tester l'espace collaboratif complet

---

## VÉRIFICATION

Pour vérifier que tout est bien configuré :

```sql
-- Vérifier le client
SELECT id, nom, prenom, email FROM clients 
WHERE email = 'sophie.martin.test@example.com';

-- Vérifier l'invitation
SELECT * FROM client_invitations 
WHERE email = 'sophie.martin.test@example.com';

-- Vérifier la liaison cabinet
SELECT * FROM cabinet_clients 
WHERE client_id = (SELECT id FROM clients WHERE email = 'sophie.martin.test@example.com');
```

Tout devrait retourner des résultats !
