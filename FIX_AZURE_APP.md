# 🔧 Correction de l'Application Azure Outlook

## ⚠️ Problème actuel

L'application `74658136-14ec-4630-ad9b-26e160ff0fc6` est configurée en **single-tenant** mais devrait être **multitenant**.

**Erreur** : `AADSTS160021: Application requested a user session which does not exist`

---

## ✅ Solution : Modifier le Manifest de l'application

### Option 1 : Via le Manifest (direct dans le navigateur)

1. **Ouvrez directement le lien de votre app** :
   ```
   https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/74658136-14ec-4630-ad9b-26e160ff0fc6
   ```

2. Dans le menu de gauche, cliquez sur **"Manifest"**

3. Cherchez la ligne `"signInAudience"` (vers la ligne 15-20)

4. **Changez la valeur** :
   ```json
   # AVANT :
   "signInAudience": "AzureADMyOrg",
   
   # APRÈS :
   "signInAudience": "AzureADandPersonalMicrosoftAccount",
   ```

5. Cliquez sur **"Save"** en haut

6. **IMPORTANT** : Ajoutez aussi le Redirect URI si ce n'est pas fait :
   - Menu gauche → **"Authentication"**
   - Sous "Platform configurations" → **"+ Add a platform"** → **"Web"**
   - Redirect URI : `https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/outlook-oauth-callback`
   - Cliquez **"Configure"**

---

### Option 2 : Essayer avec un autre navigateur

Si Azure Portal ne fonctionne toujours pas :
- **Microsoft Edge** : https://www.microsoft.com/edge
- **Firefox** : https://www.mozilla.org/firefox
- Mode navigation privée

---

### Option 3 : Demander de l'aide à quelqu'un avec un compte Microsoft qui fonctionne

Partagez ce lien avec quelqu'un qui peut accéder à Azure Portal :
- Lien direct : `https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Manifest/appId/74658136-14ec-4630-ad9b-26e160ff0fc6`
- Ils doivent juste changer `"signInAudience": "AzureADMyOrg"` → `"AzureADandPersonalMicrosoftAccount"`

---

### Option 4 : Recréer l'app (si rien ne marche)

Si vous arrivez finalement à accéder à Azure Portal :

1. **Supprimer l'ancienne app** :
   - App registrations → Trouvez l'app `74658136...`
   - Cliquez dessus → **Delete**

2. **Créer une nouvelle app** (avec les BONS paramètres) :
   - **+ New registration**
   - Name : `Neira Email Integration`
   - Supported account types : ⚠️ **3ème option** : "Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)"
   - Redirect URI : 
     - Type : `Web`
     - URL : `https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/outlook-oauth-callback`
   - **Register**

3. **Copier le nouveau Client ID**

4. **Créer le Client Secret** :
   - Certificates & secrets → + New client secret
   - Description : `Neira Production`
   - Expires : 24 months
   - **Copier la Value immédiatement**

5. **Configurer les permissions** :
   - API permissions → + Add a permission → Microsoft Graph → Delegated permissions
   - Ajouter : `Mail.ReadWrite`, `Mail.Send`, `User.Read`, `offline_access`
   - **Grant admin consent**

6. **Me donner les nouveaux identifiants** pour que je mette à jour le code

---

## 🎯 Une fois l'app corrigée

Envoyez-moi :
- ✅ Le Client ID (nouveau si recréé)
- ✅ Le Client Secret

Et je vais :
1. Mettre à jour le code
2. Configurer Supabase
3. Déployer les fonctions
4. Tester la connexion Outlook

---

## 📞 Alternative : Utiliser Gmail en attendant

Si Outlook est bloqué, vous pouvez utiliser Gmail qui fonctionne déjà :
- Gmail OAuth est déjà configuré et fonctionnel
- Vous pouvez connecter vos comptes Gmail en attendant de résoudre Outlook
