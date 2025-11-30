# 🎯 Guide de Test - Intégration Gmail OAuth2

## ✅ Ce qui a été fait

### 1. Architecture complète reconstruite
- ✅ **Edge Functions** : `gmail-oauth-callback` et `gmail-operations` déployées
- ✅ **Base de données** : Tables `email_accounts`, `emails`, `oauth_states` créées
- ✅ **Frontend** : Page `EmailIntegration.tsx` simplifiée avec bouton Gmail
- ✅ **OAuth2 Flow** : Génération state → Google consent → callback → stockage tokens

### 2. Corrections clés
- ✅ **Service Role Key** : La fonction callback utilise `SUPABASE_SERVICE_ROLE_KEY` correctement
- ✅ **Nom des fonctions** : `gmail-operations` au lieu de `gmail-sync`
- ✅ **Gestion des tokens** : Refresh automatique quand token expiré
- ✅ **Sécurité** : CSRF protection avec table `oauth_states`

---

## 🚀 Comment tester maintenant

### Étape 1 : Vérifier les secrets Supabase
```bash
supabase secrets list
```

**Secrets requis** :
- ✅ `GOOGLE_CLIENT_ID` 
- ✅ `GOOGLE_CLIENT_SECRET`
- ✅ `FRONTEND_URL` (https://neira.fr)
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` (à vérifier)

**Si manquant**, ajoutez :
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="votre_service_role_key"
```

> 💡 Vous pouvez trouver votre Service Role Key dans :
> https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/settings/api

---

### Étape 2 : Vérifier Google Cloud Console

#### Redirect URI configurée ?
✅ Doit être : `https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/gmail-oauth-callback`

#### Scopes OAuth2 configurés ?
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/gmail.compose`

#### App publiée ou test users ajoutés ?
- **Option 1** : Publier l'app (cliquer "PUBLISH APP" dans OAuth consent screen)
- **Option 2** : Ajouter votre email dans "Test users"

---

### Étape 3 : Tester le flow complet

#### A. Aller sur la page Email Integration
```
https://neira.fr/avocats/email-integration
ou
https://neira.fr/notaires/email-integration
```

#### B. Cliquer sur "Connecter mon Gmail"
- ✅ Une popup Google doit s'ouvrir
- ✅ Vous voyez l'écran de consentement Google
- ⚠️ Si "App not verified" → Cliquez "Continue"

#### C. Autoriser l'accès
- ✅ Cochez toutes les permissions
- ✅ Cliquez "Allow"

#### D. Vérifier la redirection
- ✅ La popup se ferme automatiquement
- ✅ Page principale montre un toast de succès
- ✅ Votre compte Gmail apparaît dans "Comptes connectés"

---

## 🐛 Dépannage

### Erreur 401 "Missing authorization header"
**Cause** : Le secret `SUPABASE_SERVICE_ROLE_KEY` n'est pas configuré

**Solution** :
```bash
# Récupérez votre service role key depuis le dashboard
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Redéployez le callback
supabase functions deploy gmail-oauth-callback
```

---

### Erreur "redirect_uri_mismatch"
**Cause** : L'URI de redirection dans Google Cloud Console ne correspond pas

**Solution** :
1. Allez sur https://console.cloud.google.com/
2. APIs & Services → Credentials
3. Cliquez sur votre OAuth Client ID
4. Authorized redirect URIs : **doit être exactement** :
   ```
   https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/gmail-oauth-callback
   ```

---

### Erreur "access_denied"
**Cause** : Votre email n'est pas autorisé (app non publiée)

**Solution** :
1. Google Cloud Console → OAuth consent screen
2. **Option A** : Cliquez "PUBLISH APP" (pour tous les utilisateurs)
3. **Option B** : Ajoutez votre email dans "Test users" (pendant dev)

---

### L'email ne s'affiche pas après connexion
**Vérification** :
```bash
# Vérifier les logs du callback
supabase functions logs gmail-oauth-callback --tail

# Vérifier les données en base
# (Aller sur https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/editor)
SELECT * FROM email_accounts;
```

---

## 📝 Commandes utiles

```bash
# Voir les logs en temps réel
supabase functions logs gmail-oauth-callback --tail
supabase functions logs gmail-operations --tail

# Lister les secrets
supabase secrets list

# Redéployer une fonction
supabase functions deploy gmail-oauth-callback
supabase functions deploy gmail-operations

# Vérifier les tables
supabase db diff
```

---

## 🎉 Prochaines étapes (après test réussi)

Une fois le flow OAuth fonctionnel :

1. **Page Messagerie** : Afficher les emails synchronisés
2. **Sync automatique** : Bouton pour synchroniser les emails
3. **Envoi d'emails** : Composer et envoyer depuis l'interface
4. **Support multi-comptes** : Connecter plusieurs Gmail

---

## 🔍 Architecture technique

```
┌─────────────────┐
│   FRONTEND      │
│ EmailIntegration│
│     .tsx        │
└────────┬────────┘
         │
         │ 1. Click "Connecter Gmail"
         ▼
┌─────────────────────────────┐
│   gmail-operations          │
│   action: get-auth-url      │
│   → Creates oauth_state     │
│   → Returns authUrl         │
└────────┬────────────────────┘
         │
         │ 2. Open Google popup
         ▼
┌─────────────────┐
│   GOOGLE        │
│   OAuth Consent │
└────────┬────────┘
         │
         │ 3. User authorizes
         ▼
┌─────────────────────────────┐
│   gmail-oauth-callback      │
│   → Validates state         │
│   → Exchanges code          │
│   → Gets Gmail profile      │
│   → Uses SERVICE_ROLE_KEY   │
│   → Stores in email_accounts│
└────────┬────────────────────┘
         │
         │ 4. Redirect to frontend
         ▼
┌─────────────────┐
│   FRONTEND      │
│   ?success=true │
│   Toast + Reload│
└─────────────────┘
```

---

**Testez maintenant ! Si erreur, vérifiez d'abord les secrets puis les logs.** 🚀
