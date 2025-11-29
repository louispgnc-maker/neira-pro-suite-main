# 📧 Configuration Gmail OAuth2 - Guide Complet

## ✅ Code créé ! Maintenant suivez ces étapes :

---

## 🔧 ÉTAPE 1 : Google Cloud Console

### 1.1 Créer un projet Google Cloud
1. Allez sur : https://console.cloud.google.com/
2. Cliquez sur "Select a project" → "New Project"
3. Nom : **Neira Email Integration**
4. Cliquez "Create"

### 1.2 Activer Gmail API
1. Dans votre projet, allez à : **APIs & Services** → **Library**
2. Cherchez "**Gmail API**"
3. Cliquez dessus puis **Enable**

### 1.3 Créer les credentials OAuth 2.0
1. Allez à : **APIs & Services** → **Credentials**
2. Cliquez : **Create Credentials** → **OAuth client ID**
3. Si demandé, configurez l'écran de consentement OAuth d'abord :
   - User Type: **External**
   - App name: **Neira**
   - User support email: `contact@neira.fr`
   - Developer contact: `contact@neira.fr`
   - Scopes: Ajoutez `https://www.googleapis.com/auth/gmail.readonly`, `https://www.googleapis.com/auth/gmail.send`, et `https://www.googleapis.com/auth/gmail.compose`
   - **Publishing status**: Cliquez "PUBLISH APP" pour autoriser tous les utilisateurs (sinon seuls les "Test users" pourront se connecter)
4. Retournez à Credentials → **Create Credentials** → **OAuth client ID**
5. Application type: **Web application**
6. Name: **Neira Web Client**
7. **Authorized redirect URIs** : Ajoutez
   ```
   https://xxeccstsrnwjxcdprwjd.supabase.co/functions/v1/gmail-oauth-callback
   ```

8. Cliquez **Create**
9. **📝 NOTEZ** : `Client ID` et `Client secret` (vous en aurez besoin !)

---

## 🚀 ÉTAPE 2 : Déployer les Edge Functions Supabase

### 2.1 Installer Supabase CLI (si pas déjà fait)
```bash
npm install -g supabase
```

### 2.2 Login Supabase
```bash
supabase login
```

### 2.3 Link votre projet
```bash
cd /Users/louispgnc/Desktop/neira-pro-suite-main
supabase link --project-ref xxeccstsrnwjxcdprwjd
```

### 2.4 Configurer les secrets (IMPORTANT !)
```bash
# Remplacez par vos vraies valeurs !
supabase secrets set GOOGLE_CLIENT_ID="VOTRE_CLIENT_ID"
supabase secrets set GOOGLE_CLIENT_SECRET="VOTRE_CLIENT_SECRET"
supabase secrets set FRONTEND_URL="https://neira.fr"
```

### 2.5 Déployer les fonctions
```bash
supabase functions deploy gmail-sync
supabase functions deploy gmail-oauth-callback
```

---

## 🎯 ÉTAPE 3 : Tester

### 3.1 Connecter votre compte Gmail
1. Allez sur votre site : https://neira.fr
2. Menu → **Email Integration**
3. Cliquez "Ajouter un compte"
4. Sélectionnez **Gmail**
5. Cliquez "Connecter"
6. Une popup Google s'ouvre → **Autorisez l'accès**
7. Vous êtes redirigé → Votre compte Gmail est connecté ✅

### 3.2 Synchroniser vos emails
1. Allez dans **Messagerie**
2. Sélectionnez votre compte Gmail
3. Cliquez "**Synchroniser**"
4. ✨ Vos vrais emails Gmail apparaissent !

### 3.3 Envoyer un email
1. Cliquez "**Nouveau**"
2. Remplissez : destinataire, objet, message
3. Cliquez "**Envoyer**"
4. 🚀 L'email est envoyé depuis votre Gmail !

---

## 🔍 Vérifications

### ✅ Checklist finale :
- [ ] Projet Google Cloud créé
- [ ] Gmail API activée
- [ ] OAuth Client ID créé
- [ ] Redirect URI configurée (avec votre vrai projet Supabase)
- [ ] Client ID et Secret notés
- [ ] Supabase CLI installé
- [ ] Secrets configurés dans Supabase
- [ ] Edge Functions déployées
- [ ] Test de connexion Gmail réussi

---

## 🐛 Dépannage

### Erreur "redirect_uri_mismatch"
➡️ Vérifiez que l'URI dans Google Console est exactement :
```
https://xxeccstsrnwjxcdprwjd.supabase.co/functions/v1/gmail-oauth-callback
```

### Erreur "invalid_client"
➡️ Vérifiez que les secrets sont bien configurés :
```bash
supabase secrets list
```

### Erreur "access_denied"
➡️ Ajoutez votre email dans "Test users" sur Google Cloud Console

### Les emails ne se synchronisent pas
➡️ Vérifiez les logs :
```bash
supabase functions logs gmail-sync
```

---

## 📝 Commandes utiles

```bash
# Voir les logs en temps réel
supabase functions logs gmail-sync --tail

# Redéployer après modification
supabase functions deploy gmail-sync

# Lister les secrets
supabase secrets list

# Tester localement (optionnel)
supabase functions serve
```

---

## 🎉 C'est tout !

Une fois ces étapes complétées, votre messagerie Gmail sera **entièrement fonctionnelle** dans Neira ! 

Vous pourrez :
- ✅ Voir tous vos emails Gmail réels
- ✅ Envoyer des emails depuis votre Gmail
- ✅ Répondre aux emails
- ✅ Synchroniser automatiquement

---

**Questions ? Besoin d'aide ?** Dites-moi où vous bloquez ! 💪
