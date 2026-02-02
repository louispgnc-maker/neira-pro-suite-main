# 📧 Configuration OAuth Outlook / Microsoft 365

## 1️⃣ Créer une application Microsoft Azure

### Étape 1: Accéder au portail Azure
1. Allez sur [https://portal.azure.com](https://portal.azure.com)
2. Connectez-vous avec votre compte Microsoft

### Étape 2: Enregistrer une nouvelle application
1. Dans le menu, recherchez **"Microsoft Entra ID"** (anciennement Azure Active Directory)
2. Dans le menu de gauche, cliquez sur **"App registrations"** (Inscriptions d'applications)
3. Cliquez sur **"+ New registration"** (Nouvelle inscription)

### Étape 3: Configurer l'application
- **Name**: `Neira Email Integration`
- **Supported account types**: 
  - Sélectionnez **"Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)"**
  - Ceci permet les comptes @outlook.com, @hotmail.com ET Office 365
- **Redirect URI**: 
  - Type: `Web`
  - URL: `https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/outlook-oauth-callback`

4. Cliquez sur **"Register"**

### Étape 4: Récupérer les identifiants
Une fois l'application créée:

1. **Application (client) ID**: 
   - Copiez cette valeur (format: `5c2e5ad7-f18e-4b4c-ba53-1d96a5b8d1af`)
   - Ce sera votre `OUTLOOK_CLIENT_ID`

2. **Client Secret**:
   - Dans le menu de gauche, cliquez sur **"Certificates & secrets"**
   - Sous "Client secrets", cliquez sur **"+ New client secret"**
   - Description: `Neira Production`
   - Expires: `24 months` (recommandé)
   - Cliquez sur **"Add"**
   - ⚠️ **IMPORTANT**: Copiez immédiatement la **Value** (pas le Secret ID)
   - Cette valeur ne sera plus jamais affichée !
   - Ce sera votre `OUTLOOK_CLIENT_SECRET`

### Étape 5: Configurer les permissions API
1. Dans le menu de gauche, cliquez sur **"API permissions"**
2. Vérifiez que les permissions suivantes sont présentes (ajoutez-les sinon):
   - `Mail.ReadWrite` (Delegated) - Lire et écrire les emails
   - `Mail.Send` (Delegated) - Envoyer des emails
   - `User.Read` (Delegated) - Lire le profil utilisateur
   - `offline_access` (Delegated) - Maintenir l'accès via refresh token

3. Si vous ajoutez des permissions:
   - Cliquez sur **"+ Add a permission"**
   - Sélectionnez **"Microsoft Graph"**
   - Sélectionnez **"Delegated permissions"**
   - Recherchez et cochez les permissions ci-dessus
   - Cliquez sur **"Add permissions"**

4. **IMPORTANT**: Cliquez sur **"✓ Grant admin consent for [Your Organization]"**
   - Ceci évite que chaque utilisateur doive approuver les permissions

## 2️⃣ Configurer Supabase

### Définir les variables d'environnement

```bash
# Se connecter à Supabase
npx supabase login

# Définir les secrets (remplacez par vos vraies valeurs)
npx supabase secrets set --env-file .env.local \
  OUTLOOK_CLIENT_ID="5c2e5ad7-f18e-4b4c-ba53-1d96a5b8d1af" \
  OUTLOOK_CLIENT_SECRET="votre_secret_ici"
```

Ou via le dashboard Supabase:
1. Allez sur [https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/settings/functions](https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/settings/functions)
2. Sous "Secrets", ajoutez:
   - `OUTLOOK_CLIENT_ID`: Votre Application (client) ID
   - `OUTLOOK_CLIENT_SECRET`: Votre Client Secret Value

## 3️⃣ Déployer les Edge Functions

```bash
# Déployer toutes les fonctions Outlook
npx supabase functions deploy outlook-oauth-callback
npx supabase functions deploy outlook-refresh-token
npx supabase functions deploy outlook-send
npx supabase functions deploy outlook-sync
```

## 4️⃣ Tester la configuration

### Test 1: Vérifier les secrets
```bash
npx supabase secrets list
```

Vous devriez voir:
- ✅ `OUTLOOK_CLIENT_ID`
- ✅ `OUTLOOK_CLIENT_SECRET`

### Test 2: Connexion Outlook
1. Allez sur votre application → Paramètres → Emails
2. Cliquez sur **"Connecter Outlook"**
3. Une popup s'ouvre vers Microsoft
4. Connectez-vous avec un compte:
   - @outlook.com
   - @hotmail.com
   - Ou votre compte Office 365
5. Acceptez les permissions
6. La popup se ferme et votre compte apparaît dans la liste

### Test 3: Envoi d'email
1. Allez dans la boîte de réception email
2. Composez un nouveau message
3. Envoyez un email de test
4. Vérifiez que l'email est bien envoyé via Outlook

## 🔧 Dépannage

### Erreur "AADSTS50011: The redirect URI specified in the request does not match"
- Vérifiez que l'URI de redirection dans Azure correspond exactement:
  `https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/outlook-oauth-callback`
- Pas d'espace, pas de slash final

### Erreur "AADSTS650053: The application requested offline_access"
- Dans Azure, sous "API permissions", vérifiez que `offline_access` est bien ajouté
- Cliquez sur "Grant admin consent"

### Erreur "token_exchange_failed"
- Vérifiez que `OUTLOOK_CLIENT_SECRET` est correct
- Le secret expire après 24 mois, créez-en un nouveau si nécessaire

### Erreur "database_error"
- Vérifiez que la table `email_accounts` existe dans Supabase
- Vérifiez les logs de la fonction via le dashboard Supabase

## 📚 Ressources

- [Microsoft Graph API Documentation](https://learn.microsoft.com/en-us/graph/overview)
- [Register an application with Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
- [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference)

## ✅ Checklist finale

- [ ] Application créée dans Azure Portal
- [ ] `OUTLOOK_CLIENT_ID` récupéré
- [ ] `OUTLOOK_CLIENT_SECRET` généré et copié
- [ ] Permissions API configurées (Mail.ReadWrite, Mail.Send, User.Read, offline_access)
- [ ] Admin consent accordé
- [ ] Secrets définis dans Supabase
- [ ] Edge Functions déployées
- [ ] Test de connexion réussi
- [ ] Test d'envoi d'email réussi
