# 🚀 Configuration rapide EmailJS - 5 minutes

## ✅ Checklist

- [ ] Créer le template EmailJS
- [ ] Copier le Template ID
- [ ] Configurer les 3 secrets Supabase
- [ ] Tester l'envoi d'un email

---

## 📧 Étape 1 : Créer le template (2 minutes)

### 1.1 Aller sur EmailJS
👉 https://dashboard.emailjs.com/admin/templates

### 1.2 Créer un nouveau template
- Cliquez sur **"Create New Template"**
- Nommez-le : `client_form_invite`

### 1.3 Configurer l'email

**Subject (Objet) :**
```
{{cabinet_name}} - Formulaire à compléter
```

**Content (Corps) :** *(copiez-collez le code HTML complet du fichier EMAILJS_CLIENT_FORM_SETUP.md)*

### 1.4 Configurer les variables
Dans la section "Template Settings" → "Template Variables" :
- ✅ `to_email` → Email du destinataire
- ✅ `to_name` → Nom du destinataire
- ✅ `cabinet_name` → Nom du cabinet
- ✅ `form_url` → Lien du formulaire
- ✅ `expiration_date` → Date d'expiration

### 1.5 Sauvegarder et copier l'ID
- Cliquez sur **"Save"**
- **IMPORTANT** : Copiez le **Template ID** (format: `template_xxx...`)

---

## 🔑 Étape 2 : Configurer Supabase (2 minutes)

### 2.1 Aller sur Supabase
👉 https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/settings/functions

### 2.2 Ajouter les secrets
Dans la section **"Edge Functions Secrets"**, cliquez sur **"Add new secret"** :

| Secret Name | Where to find | Example |
|-------------|---------------|---------|
| `EMAILJS_SERVICE_ID` | https://dashboard.emailjs.com/admin → Services | `service_abc123` |
| `EMAILJS_CLIENT_FORM_TEMPLATE_ID` | Template créé à l'étape 1 | `template_def456` |
| `EMAILJS_USER_ID` | https://dashboard.emailjs.com/admin/account → API Keys → Public Key | `xyz789user` |

**Important :** Cliquez sur **"Save"** après chaque secret ajouté.

---

## 🧪 Étape 3 : Tester (1 minute)

### 3.1 Dans l'application Neira
1. Allez dans **Clients**
2. Cliquez sur **"Créer un lien de formulaire client"**
3. Entrez VOTRE email et votre nom
4. Cliquez sur **"Générer le lien"**

### 3.2 Vérifier le résultat

**✅ Si l'email est envoyé :**
- Message vert : "Email envoyé avec succès !"
- Vérifiez votre boîte email
- Cliquez sur le lien dans l'email
- Remplissez le formulaire de test

**⚠️ Si l'email n'est pas envoyé :**
- Message orange : "Lien du formulaire généré"
- Vérifiez que les 3 secrets sont bien configurés dans Supabase
- Vérifiez les logs : `supabase functions logs send-client-form`

---

## 🔍 Vérification avancée

### Logs Supabase
```bash
cd /Users/louispgnc/Desktop/neira-pro-suite-main
supabase functions logs send-client-form
```

**Logs OK :**
```
✅ EmailJS config check: { hasServiceId: true, hasTemplateId: true, hasUserId: true }
✅ Email sent successfully to client@example.com
```

**Logs KO :**
```
❌ Please configure these environment variables in Supabase:
- EMAILJS_SERVICE_ID
- EMAILJS_CLIENT_FORM_TEMPLATE_ID  
- EMAILJS_USER_ID
```

### Historique EmailJS
👉 https://dashboard.emailjs.com/admin/history
- Vérifiez que l'email apparaît dans l'historique
- Statut "Sent" = OK
- Statut "Failed" = Vérifier l'email du destinataire

---

## ❓ FAQ Rapide

### L'email n'arrive pas
1. ✅ Vérifier les spams
2. ✅ Vérifier l'email du client
3. ✅ Vérifier le quota EmailJS (200/mois gratuit)
4. ✅ Vérifier les logs Supabase

### "Configuration EmailJS manquante"
→ Les 3 secrets ne sont pas configurés dans Supabase. Retournez à l'étape 2.

### "Template not found"
→ Le Template ID est incorrect. Vérifiez-le sur EmailJS.

### Le formulaire fonctionne mais pas l'email
→ C'est normal ! Le formulaire est créé même si l'email échoue. Configurez EmailJS pour activer l'envoi automatique.

---

## 📊 Quota EmailJS

**Plan Gratuit :** 200 emails/mois
- ✅ Suffisant pour ~6-7 clients/jour
- ✅ Pas de carte bancaire requise
- ✅ Upgrade possible : https://www.emailjs.com/pricing/

---

## 🎯 Résultat final

Une fois configuré, quand vous générez un formulaire :
1. ✅ Le formulaire est créé en base
2. ✅ Un email part automatiquement au client
3. ✅ Le client clique sur le lien dans l'email
4. ✅ Le client remplit le formulaire
5. ✅ Sa fiche est créée automatiquement dans "Clients"

🎉 **C'est tout ! Aucune manipulation manuelle nécessaire.**
