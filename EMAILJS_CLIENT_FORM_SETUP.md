# 📧 Configuration EmailJS pour l'envoi automatique des formulaires clients

## 📋 Étape 1 : Créer le template EmailJS

1. Allez sur https://dashboard.emailjs.com/admin/templates
2. Cliquez sur **Create New Template**
3. Nommez-le "Client Form - Fiche à compléter"
4. Copiez-collez ce template :

### Subject
```
{{cabinet_name}} - Formulaire d'informations à compléter
```

### Content (HTML)
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f97316 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #f97316; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Formulaire d'informations client</h1>
        </div>
        <div class="content">
            <p>Bonjour {{to_name}},</p>
            
            <p>{{cabinet_name}} vous invite à compléter vos informations personnelles via notre formulaire sécurisé.</p>
            
            <div class="info-box">
                <strong>📋 Pourquoi ce formulaire ?</strong><br>
                Ce formulaire nous permettra de créer votre dossier client et de vous accompagner au mieux dans vos démarches.
            </div>
            
            <p style="text-align: center;">
                <a href="{{form_url}}" class="button">Compléter le formulaire</a>
            </p>
            
            <div class="info-box">
                <strong>⏱️ Temps estimé :</strong> 5-10 minutes<br>
                <strong>🔒 Sécurité :</strong> Toutes vos données sont chiffrées et confidentielles<br>
                <strong>📅 Validité :</strong> Ce lien expire le {{expiration_date}}
            </div>
            
            <p><strong>Informations demandées :</strong></p>
            <ul>
                <li>État civil (nom, prénom, date de naissance)</li>
                <li>Coordonnées (adresse, téléphone, email)</li>
                <li>Situation familiale et professionnelle</li>
                <li>Informations complémentaires si nécessaire</li>
            </ul>
            
            <p>Si vous rencontrez un problème avec ce formulaire, vous pouvez nous contacter directement.</p>
            
            <p>Cordialement,<br>
            <strong>{{cabinet_name}}</strong></p>
        </div>
        <div class="footer">
            <p>© 2025 Neira - Plateforme professionnelle pour avocats et notaires</p>
            <p>Si vous n'êtes pas concerné par ce message, vous pouvez l'ignorer.</p>
        </div>
    </div>
</body>
</html>
```

---

## 🔑 Étape 2 : Configurer les secrets Supabase

1. **Allez sur votre dashboard Supabase** : https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/settings/functions

2. Dans la section **Edge Functions Secrets**, ajoutez ou vérifiez ces 3 variables :

| Variable Name | Où la trouver | Description |
|---------------|---------------|-------------|
| `EMAILJS_SERVICE_ID` | https://dashboard.emailjs.com/admin → Services → Copier l'ID | Votre Service ID EmailJS |
| `EMAILJS_CLIENT_FORM_TEMPLATE_ID` | https://dashboard.emailjs.com/admin/templates → Copier l'ID du template créé | Le Template ID créé à l'étape 1 |
| `EMAILJS_USER_ID` | https://dashboard.emailjs.com/admin/account → API Keys → Public Key | Votre Public Key EmailJS |

3. Cliquez sur **Save** après avoir ajouté chaque secret

---

## 🔄 Étape 3 : Redéployer la fonction Edge (si nécessaire)

Si vous venez d'ajouter les secrets, redéployez la fonction :

```bash
cd /Users/louispgnc/Desktop/neira-pro-suite-main
supabase functions deploy send-client-form
```

---

## 📝 Variables du template EmailJS

Le template utilise ces variables (à configurer dans EmailJS) :
- `{{to_email}}` : Email du client (dans le champ "To Email")
- `{{to_name}}` : Nom du client
- `{{cabinet_name}}` : Nom du cabinet
- `{{form_url}}` : Lien vers le formulaire sécurisé
- `{{expiration_date}}` : Date d'expiration du formulaire (30 jours)

---

## ✅ Étape 4 : Tester l'envoi automatique

### Test complet :

1. Dans l'application, allez dans la section **Clients**
2. Cliquez sur **Créer un lien de formulaire client**
3. Entrez l'email et le nom du client
4. Cliquez sur **Générer le lien**

**Résultat attendu :**
- ✅ Le formulaire est créé dans la base de données
- ✅ Un email est automatiquement envoyé au client
- ✅ Le client reçoit un lien sécurisé valable 30 jours
- ✅ Quand le client remplit le formulaire, sa fiche est créée automatiquement

---

## 🔍 Vérifier que ça fonctionne

### Méthode 1 : Vérifier dans l'application
Après avoir généré un formulaire, vous devriez voir une notification indiquant que l'email a été envoyé.

### Méthode 2 : Vérifier les logs Supabase
```bash
supabase functions logs send-client-form
```

**Logs attendus en cas de succès :**
```
✅ EmailJS config check: { hasServiceId: true, hasTemplateId: true, hasUserId: true, formUrl: '...' }
✅ Email sent successfully to client@example.com
```

**Logs en cas de problème :**
```
❌ EmailJS configuration missing
Please configure these environment variables in Supabase:
- EMAILJS_SERVICE_ID
- EMAILJS_CLIENT_FORM_TEMPLATE_ID
- EMAILJS_USER_ID
```

---

## 📊 Quota EmailJS

Le plan gratuit EmailJS offre :
- ✅ **200 emails/mois**
- ✅ 2 services email
- ✅ Templates illimités

Si vous dépassez ce quota, vous devrez upgrader votre plan EmailJS : https://www.emailjs.com/pricing/

---

## 🆘 Problèmes courants

### ❌ "Email non envoyé (configuration EmailJS manquante)"
**Solution :** Les secrets Supabase ne sont pas définis. Allez à l'étape 2 et ajoutez les 3 variables.

### ❌ "EmailJS API returned error 403 Forbidden"
**Solution :** Votre User ID (Public Key) EmailJS est incorrect. Vérifiez-le sur https://dashboard.emailjs.com/admin/account

### ❌ "Service not found"
**Solution :** Votre Service ID EmailJS est incorrect. Vérifiez-le sur https://dashboard.emailjs.com/admin

### ❌ "Template not found"
**Solution :** Votre Template ID est incorrect. Vérifiez-le sur https://dashboard.emailjs.com/admin/templates

### ❌ Le client ne reçoit pas l'email
**Solutions possibles :**
1. Vérifiez les spam/courrier indésirable du client
2. Vérifiez que l'email du client est correct
3. Vérifiez les logs EmailJS : https://dashboard.emailjs.com/admin/history
4. Vérifiez que votre quota EmailJS n'est pas dépassé

### ❌ Le formulaire n'est pas créé en base de données
**Solution :** Vérifiez les logs de la fonction Edge :
```bash
supabase functions logs send-client-form
```

---

## 📚 Ressources supplémentaires

- Documentation EmailJS : https://www.emailjs.com/docs/
- Dashboard EmailJS : https://dashboard.emailjs.com/
- Support EmailJS : https://www.emailjs.com/contact/
- Documentation Supabase Edge Functions : https://supabase.com/docs/guides/functions
