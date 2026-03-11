# 🧪 Système de Comptes Test - Documentation

## Vue d'ensemble

Les comptes test permettent de donner un accès démo complet à Neira tout en suivant le flux d'onboarding normal. Ces comptes sont automatiquement upgradés vers **Cabinet-Plus** dès la création de leur cabinet.

## Architecture

### 1. Marqueur de compte test
- **Table**: `profiles`
- **Colonne**: `is_test_account BOOLEAN DEFAULT false`
- **Index**: `idx_profiles_test_account` (optimisé pour les requêtes)

### 2. Auto-upgrade dans `create_cabinet()`

La fonction RPC `create_cabinet` détecte automatiquement les comptes test :

```sql
-- Vérifier si c'est un compte test
select is_test_account into v_is_test_account
from profiles
where id = v_user_id;

-- Définir le tier selon le type de compte
if v_is_test_account then
  v_subscription_tier := 'cabinet-plus';
  v_max_members := null; -- illimité
else
  v_subscription_tier := 'gratuit';
  v_max_members := 3;
end if;
```

### 3. Script de configuration

**Fichier**: `configure-denis.js`

Le script ne crée **que l'utilisateur** et marque le compte comme test. Il ne crée **pas** le cabinet.

```bash
node configure-denis.js
```

Résultat :
- ✅ Compte créé/mis à jour : `denis@neira.test`
- ✅ Profil configuré : `role = 'avocat'`, `is_test_account = true`
- ⚠️ Aucun cabinet créé (à faire via l'interface)

### 4. Script de nettoyage

**Fichier**: `cleanup-denis.js`

Supprime complètement un compte test et toutes ses données.

```bash
node cleanup-denis.js
```

Supprime dans l'ordre :
1. `signature_requests`
2. `contrats`
3. `dossiers`
4. `clients`
5. `calendar_events`
6. `cabinet_members`
7. Partages cabinet (clients, dossiers, contrats)
8. `cabinets`
9. `profiles`
10. `auth.users`

## Flux d'utilisation

### Création d'un compte test

1. **Exécuter le script de configuration** :
   ```bash
   node configure-denis.js
   ```

2. **Se connecter** :
   - URL : https://neira.fr/avocats/login
   - Email : `denis@neira.test`
   - Mot de passe : `Denis2026!Test`

3. **Suivre le flux normal** :
   - Sélectionner la profession ("Je suis avocat")
   - Remplir le formulaire de création de cabinet
   - Soumettre le formulaire

4. **Auto-upgrade automatique** :
   - ✨ Le cabinet est créé avec `subscription_tier = 'cabinet-plus'`
   - ✨ `max_members = null` (illimité)
   - ✨ `subscription_status = 'active'`

### Réinitialisation d'un compte test

```bash
# 1. Nettoyer toutes les données
node cleanup-denis.js

# 2. Reconfigurer le compte
node configure-denis.js

# 3. Se reconnecter et recréer le cabinet
```

## Avantages

### Pour les tests/démos :
- ✅ **Expérience authentique** : Le compte suit le même flux qu'un utilisateur normal
- ✅ **Fonctionnalités complètes** : Accès à toutes les features Cabinet-Plus
- ✅ **Facile à réinitialiser** : Un script suffit pour repartir de zéro
- ✅ **Pas de configuration manuelle** : L'upgrade est automatique

### Pour le code :
- ✅ **Un seul flux** : Pas de logique spéciale dans l'interface
- ✅ **Centralisé** : Toute la logique est dans `create_cabinet()`
- ✅ **Traçable** : Le marqueur `is_test_account` identifie clairement les comptes

## Fichiers modifiés

### Base de données
- [add-test-account-marker.sql](add-test-account-marker.sql) - Ajout colonne `is_test_account`
- [update-create-cabinet-test-accounts.sql](update-create-cabinet-test-accounts.sql) - Modification fonction `create_cabinet`

### Scripts
- [configure-denis.js](configure-denis.js) - Configuration compte test
- [cleanup-denis.js](cleanup-denis.js) - Nettoyage compte test

### Fonction SQL
- `supabase/migrations/2025-11-06_founder_role.sql` - Fonction `create_cabinet` modifiée

## Ajout d'un nouveau compte test

Pour créer un autre compte test (ex: `marie@neira.test`) :

1. **Dupliquer les scripts** :
   ```bash
   cp configure-denis.js configure-marie.js
   cp cleanup-denis.js cleanup-marie.js
   ```

2. **Remplacer l'email** dans les deux fichiers :
   ```javascript
   // De
   email: 'denis@neira.test'
   
   // Vers
   email: 'marie@neira.test'
   ```

3. **Utiliser normalement** :
   ```bash
   node configure-marie.js
   ```

## Vérifications

### Vérifier qu'un compte est marqué comme test

```sql
SELECT p.id, p.is_test_account, u.email 
FROM profiles p 
JOIN auth.users u ON u.id = p.id 
WHERE u.email = 'denis@neira.test';
```

### Vérifier l'upgrade du cabinet

```sql
SELECT c.nom, c.subscription_tier, c.max_members, c.subscription_status
FROM cabinets c
JOIN profiles p ON p.id = c.owner_id
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'denis@neira.test';
```

Résultat attendu :
```
nom                      | subscription_tier | max_members | subscription_status
-------------------------|-------------------|-------------|-------------------
Cabinet Denis Test       | cabinet-plus      | null        | active
```

## Notes importantes

⚠️ **Les comptes test ne doivent pas être utilisés en production** avec de vraies données clients.

⚠️ **Le marqueur `is_test_account` est permanent** - il ne peut être changé que manuellement via SQL.

✅ **Les comptes test peuvent être supprimés à tout moment** sans impacter les autres utilisateurs.

✅ **Plusieurs comptes test peuvent coexister** - chacun est indépendant.
