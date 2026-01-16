# ⚠️ AVANT DE CRÉER UN CLIENT DE TEST

## Vous devez d'abord avoir un compte professionnel !

### ÉTAPE 1 : Créer votre compte professionnel

1. **Allez sur votre site** : `/avocats/auth` ou `/notaires/auth`

2. **Créez votre compte professionnel** :
   - Email professionnel
   - Mot de passe
   - Acceptez les conditions

3. **Vous serez redirigé vers** : `/select-profession`
   - Choisissez Avocat ou Notaire
   - Cela créera automatiquement votre cabinet

4. **Remplissez les informations du cabinet** :
   - Nom du cabinet
   - Adresse, etc.

### ÉTAPE 2 : Une fois votre cabinet créé

**Exécutez simplement :**

```bash
node scripts/create-test-client-auto.mjs
```

Le script créera automatiquement :
- ✅ Un client de test (Sophie Martin)
- ✅ Une invitation avec un code d'accès
- ✅ La liaison entre le client et votre cabinet

Vous obtiendrez alors :
- Email du client
- Code d'accès 
- Instructions complètes

---

## ALTERNATIVE : Créer manuellement via Supabase Dashboard

Si vous avez déjà un compte professionnel mais que le script ne trouve pas votre cabinet :

1. **Allez sur Supabase Dashboard → SQL Editor**

2. **Vérifiez vos cabinets** :
```sql
SELECT * FROM cabinets ORDER BY created_at DESC;
```

3. **Si aucun cabinet, créez-en un** :
```sql
-- Remplacez YOUR_USER_ID par votre user_id (depuis auth.users)
INSERT INTO cabinets (owner_id, nom, role, created_at)
VALUES ('YOUR_USER_ID', 'Mon Cabinet Test', 'avocat', NOW())
RETURNING *;
```

4. **Puis réexécutez** :
```bash
node scripts/create-test-client-auto.mjs
```

---

## RÉSUMÉ

1. ✅ Créez d'abord votre compte pro sur `/avocats/auth`
2. ✅ Créez votre cabinet via `/select-profession`  
3. ✅ Exécutez `node scripts/create-test-client-auto.mjs`
4. ✅ Utilisez les identifiants affichés pour tester !
