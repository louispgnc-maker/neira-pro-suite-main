# Template EmailJS pour le formulaire client

## Créer le template dans EmailJS

1. Allez dans **Email Templates** sur https://dashboard.emailjs.com/
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

## Configuration Supabase

Ajoutez cette variable d'environnement dans votre projet Supabase :

```bash
EMAILJS_CLIENT_FORM_TEMPLATE_ID=votre_template_id
```

### Aller dans Supabase Dashboard :
1. Project Settings > Edge Functions > Secrets
2. Ajoutez : `EMAILJS_CLIENT_FORM_TEMPLATE_ID` avec l'ID du template créé ci-dessus
3. Vérifiez que `EMAILJS_SERVICE_ID` et `EMAILJS_USER_ID` sont déjà configurés

## Variables du template

Le template utilise ces variables :
- `{{to_email}}` : Email du client
- `{{to_name}}` : Nom du client
- `{{cabinet_name}}` : Nom du cabinet
- `{{form_url}}` : Lien vers le formulaire
- `{{expiration_date}}` : Date d'expiration du formulaire (7 jours)

## Test

Pour tester l'envoi :
1. Allez sur le Dashboard
2. Cliquez sur "Fiche client" > "Fiche à compléter par le client"
3. Entrez un email et un nom
4. Vérifiez la réception de l'email
5. Cliquez sur le lien et complétez le formulaire
6. Vérifiez qu'une fiche client a été créée automatiquement dans "Clients"
