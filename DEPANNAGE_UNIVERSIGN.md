# 🔧 Dépannage des erreurs de signature Universign

## Erreur rencontrée

Erreur 500 (Internal Server Error) lors de la création d'une signature avec le message:
```
Error creating signature: - Error: Failed to create transaction
```

---

## 🔍 Diagnostic rapide

### 1. Vérifier les logs de la fonction

Ouvrez la console développeur du navigateur (F12) et regardez:
- Les erreurs dans l'onglet Console
- Les requêtes réseau dans l'onglet Network
- Cherchez la requête vers `universign-create-signature`

### 2. Vérifier les secrets Supabase

```bash
# Lister les secrets configurés
supabase secrets list

# Vérifier que ces secrets existent:
# - UNIVERSIGN_USERNAME ou UNIVERSIGN_API_KEY
# - UNIVERSIGN_PASSWORD (si USERNAME utilisé)
# - UNIVERSIGN_API_URL (optionnel, a une valeur par défaut)
```

### 3. Tester l'authentification Universign

```bash
# Tester la connexion à l'API
node test-universign-api.mjs
```

---

## 🛠️ Solutions par problème

### Problème 1: Identifiants manquants ou incorrects

**Symptômes:**
- Erreur 401 (Unauthorized) ou 403 (Forbidden)
- Message: "Universign credentials not configured"

**Solution:**
```bash
# Configurer avec API Key (méthode moderne):
supabase secrets set UNIVERSIGN_API_KEY=votre_api_key

# OU configurer avec Username/Password (méthode classique):
supabase secrets set UNIVERSIGN_USERNAME=votre_username
supabase secrets set UNIVERSIGN_PASSWORD=votre_password

# Configurer l'URL de l'API
supabase secrets set UNIVERSIGN_API_URL=https://ws.universign.eu/tsa/v1
```

### Problème 2: Mauvais environnement (production vs test)

**Symptômes:**
- Erreur 500
- Les identifiants de test ne fonctionnent pas en production

**Solution:**
Vérifiez que vous utilisez la bonne URL:

```bash
# Pour production:
supabase secrets set UNIVERSIGN_API_URL=https://ws.universign.eu/tsa/v1

# Pour test/sandbox (si disponible):
supabase secrets set UNIVERSIGN_API_URL=https://sign.test.cryptolog.com/tsa/v1
```

### Problème 3: Document inaccessible

**Symptômes:**
- Erreur 500
- Message dans les logs: "Document URL not accessible"

**Solution:**

1. Vérifier que le bucket Storage est public:
```sql
-- Dans le SQL Editor de Supabase
SELECT * FROM storage.buckets WHERE name = 'documents';
-- La colonne 'public' doit être TRUE
```

2. Rendre le bucket public si nécessaire:
```sql
UPDATE storage.buckets 
SET public = true 
WHERE name = 'documents';
```

3. Vérifier les politiques RLS du Storage:
```bash
# Appliquer les politiques de storage
./apply-storage-rls-migration.mjs
```

### Problème 4: Format de requête incorrect

**Symptômes:**
- Erreur 400 (Bad Request) ou 500
- Message: "Failed to create transaction"

**Solution:**

La fonction a été mise à jour pour inclure le document dans la requête initiale. 
Si le problème persiste, c'est que l'API Universign attend un format différent.

**Vérifications:**
1. Contactez le support Universign pour obtenir:
   - La documentation de votre version d'API
   - Des exemples de requêtes valides
   - Confirmation du endpoint correct

2. Vérifiez dans votre compte Universign:
   - Le type de compte (API REST moderne vs SOAP classique)
   - Les permissions de votre API Key
   - Les limites de votre compte

### Problème 5: Certificat SSL ou problèmes réseau

**Symptômes:**
- Erreur de connexion
- Timeout
- SSL certificate error

**Solution:**
```bash
# Tester la connexion directement
curl -v https://ws.universign.eu/tsa/v1/requester/requestTransaction

# Si le certificat pose problème, vérifiez la date/heure du système
date
```

---

## 📊 Vérifications post-déploiement

### Checklist complète

- [ ] Les secrets Supabase sont configurés
- [ ] L'authentification Universign fonctionne (test-universign-api.mjs)
- [ ] Le bucket Storage 'documents' est public
- [ ] Les politiques RLS du Storage sont appliquées
- [ ] La fonction `universign-create-signature` est déployée
- [ ] Les logs de la fonction ne montrent pas d'erreurs de configuration

### Test manuel

1. Ouvrir l'application Neira
2. Aller dans Signatures
3. Créer une nouvelle signature
4. Ouvrir la console développeur (F12)
5. Vérifier les logs de la requête

### Récupérer les logs détaillés

Les logs détaillés sont maintenant disponibles dans:
1. La console développeur du navigateur
2. La console Supabase (si vous avez accès aux logs)
3. Les réponses d'erreur incluent maintenant:
   - Le status HTTP
   - Les détails de l'erreur
   - L'endpoint utilisé
   - La requête envoyée

---

## 🆘 Support

Si le problème persiste après avoir vérifié tous ces points:

1. **Collectez les informations:**
   ```bash
   # Exécutez le diagnostic
   node test-universign-api.mjs > diagnostic.txt 2>&1
   
   # Vérifiez les secrets (sans afficher les valeurs)
   supabase secrets list >> diagnostic.txt
   ```

2. **Vérifiez avec Universign:**
   - Contactez le support Universign
   - Fournissez-leur les logs d'erreur
   - Demandez la documentation de l'API pour votre compte

3. **Informations à fournir:**
   - Le type de compte Universign (production/test)
   - La méthode d'authentification utilisée (API Key ou Username/Password)
   - Les logs complets de l'erreur
   - Le résultat du script de diagnostic

---

## 🔄 Redéploiement

Si vous avez modifié la configuration:

```bash
# Redéployer la fonction
supabase functions deploy universign-create-signature

# Attendre quelques secondes puis tester
# Les changements peuvent prendre 10-30 secondes pour être actifs
```

---

## 📝 Notes importantes

1. **Les secrets ne sont pas visibles:** Les secrets Supabase sont cryptés et ne peuvent pas être lus après configuration. Si vous n'êtes pas sûr qu'ils soient corrects, reconfigurez-les.

2. **Deux méthodes d'authentification:** Universign supporte API Key (moderne) ou Username/Password (classique). Utilisez celle fournie par votre compte.

3. **URL publiques requises:** Universign doit pouvoir télécharger le document depuis une URL publique. Le bucket Storage doit être public.

4. **Délai de déploiement:** Après avoir modifié les secrets ou redéployé une fonction, attendez 30 secondes avant de tester.
