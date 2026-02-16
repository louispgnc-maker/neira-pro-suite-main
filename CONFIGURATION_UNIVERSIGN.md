# Configuration Universign - Guide de déploiement

## 📋 Étape 1 : Obtenir les identifiants Universign

1. Connectez-vous à votre compte Universign
2. Récupérez vos identifiants API :
   - Username (nom d'utilisateur API)
   - Password (mot de passe API)
   - URL de l'API (production ou test)

### URLs Universign

- **Production** : `https://ws.universign.eu/tsa/v1`
- **Test/Sandbox** : `https://sign.test.cryptolog.com/tsa/v1` (si disponible)

---

## 🗄️ Étape 2 : Appliquer la migration de base de données

Ajoutez les colonnes nécessaires à la table `signatures` :

```bash
# Depuis votre terminal local
psql $DATABASE_URL -f add-universign-columns.sql
```

Ou depuis le Dashboard Supabase :
1. Allez dans SQL Editor
2. Copiez le contenu de `add-universign-columns.sql`
3. Exécutez la requête

---

## 🚀 Étape 3 : Déployer les Edge Functions

```bash
./deploy-universign-functions.sh
```

Cette commande déploie :
- `universign-create-signature` - Création de demandes de signature
- `universign-check-status` - Vérification du statut des signatures

---

## 🔐 Étape 4 : Configurer les secrets Supabase

Configurez les identifiants API dans Supabase :

```bash
# Méthode 1 : Via la CLI Supabase
supabase secrets set UNIVERSIGN_USERNAME=votre_username
supabase secrets set UNIVERSIGN_PASSWORD=votre_password
supabase secrets set UNIVERSIGN_API_URL=https://ws.universign.eu/tsa/v1

# Méthode 2 : Via le Dashboard Supabase
# 1. Allez dans Settings > Edge Functions
# 2. Cliquez sur "Manage secrets"
# 3. Ajoutez chaque secret manuellement
```

### Variables requises

| Variable | Description | Example |
|----------|-------------|---------|
| `UNIVERSIGN_USERNAME` | Nom d'utilisateur API Universign | `votre_email@example.com` |
| `UNIVERSIGN_PASSWORD` | Mot de passe API Universign | `votre_mot_de_passe_api` |
| `UNIVERSIGN_API_URL` | URL de l'API (production ou test) | `https://ws.universign.eu/tsa/v1` |

---

## ✅ Étape 5 : Tester l'intégration

### Test manuel depuis l'interface

1. Ouvrez votre dashboard (avocat ou notaire)
2. Allez dans l'onglet "Signatures"
3. Cliquez sur "Lancer une signature"
4. Sélectionnez un document
5. Ajoutez un signataire
6. Choisissez le niveau de signature (simple/avancé/qualifié)
7. Validez

### Vérifications

- [ ] Email de signature reçu par le signataire
- [ ] Lien de signature fonctionnel
- [ ] Signature dans l'interface Universign
- [ ] Statut mis à jour dans la table `signatures`
- [ ] Document signé téléchargeable après signature

### Logs à vérifier

```bash
# Voir les logs des Edge Functions
supabase functions logs universign-create-signature
supabase functions logs universign-check-status
```

---

## 🔍 Dépannage

### Erreur "Universign credentials not configured"

**Solution** : Vérifiez que les secrets sont bien configurés dans Supabase

```bash
# Lister les secrets
supabase secrets list
```

### Erreur "Failed to create signature request"

**Causes possibles** :
- Identifiants API incorrects
- Document non trouvé dans le storage
- URL de callback invalide

**Solution** : Vérifiez les logs de la fonction

```bash
supabase functions logs universign-create-signature --limit 50
```

### Signature reste en statut "pending"

**Solution** : Vérifiez manuellement le statut

```sql
SELECT * FROM signatures 
WHERE universign_transaction_id = 'VOTRE_TRANSACTION_ID';
```

Puis appelez manuellement la fonction de vérification :

```bash
curl -X POST \
  https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/universign-check-status \
  -H "Content-Type: application/json" \
  -d '{"transactionId": "VOTRE_TRANSACTION_ID"}'
```

---

## 📊 Niveaux de signature Universign

| Niveau | Description | Usage |
|--------|-------------|-------|
| `simple` | Signature électronique simple | Documents internes, contrats simples |
| `advanced` | Signature électronique avancée | Contrats commerciaux, mandats |
| `qualified` | Signature électronique qualifiée | Actes authentiques, documents juridiques |

---

## 🔄 Migration depuis YouSign (optionnel)

Si vous aviez des signatures YouSign actives :

1. Les anciennes signatures YouSign continueront de fonctionner
2. Les nouvelles signatures utiliseront automatiquement Universign
3. Aucune migration de données historiques n'est nécessaire

---

## 📝 Checklist finale

- [ ] Identifiants Universign récupérés
- [ ] Migration SQL appliquée (`add-universign-columns.sql`)
- [ ] Edge Functions déployées
- [ ] Secrets configurés dans Supabase
- [ ] Test de création de signature effectué
- [ ] Email de signature reçu
- [ ] Signature complétée avec succès
- [ ] Document signé récupéré

---

## 🆘 Support

En cas de problème :

1. Vérifiez les logs des Edge Functions
2. Consultez la documentation Universign : https://www.universign.com/documentation
3. Vérifiez les statuts dans la table `signatures`

---

**✅ Une fois toutes ces étapes complétées, l'intégration Universign est opérationnelle !**
