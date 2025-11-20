# Configuration EmailJS pour le formulaire de contact

## Étapes de configuration (5 minutes)

### 1. Créer un compte EmailJS
1. Allez sur https://www.emailjs.com/
2. Cliquez sur "Sign Up" (gratuit)
3. Créez votre compte avec votre email

### 2. Ajouter un service email
1. Dans le dashboard EmailJS, allez dans **Email Services**
2. Cliquez sur **Add New Service**
3. Choisissez votre provider email (Gmail recommandé)
4. Connectez votre compte email (celui qui recevra les messages)
5. Notez le **Service ID** (ex: `service_abc123`)

### 3. Créer un template d'email
1. Allez dans **Email Templates**
2. Cliquez sur **Create New Template**
3. Copiez-collez ce template :

```
Subject: Nouveau message de {{from_name}}

Nouveau message depuis le formulaire de contact Neira :

Nom complet : {{from_name}}
Email : {{from_email}}
Téléphone : {{phone}}
Cabinet/Entreprise : {{company}}

Message :
{{message}}

---
Envoyé depuis neira.fr
```

4. Notez le **Template ID** (ex: `template_xyz789`)

### 4. Obtenir votre clé publique
1. Allez dans **Account** > **General**
2. Trouvez votre **Public Key** (ex: `abcDEF123ghiJKL`)

### 5. Configurer le code
Ouvrez `src/pages/Contact.tsx` et remplacez :
- `'YOUR_SERVICE_ID'` → votre Service ID
- `'YOUR_TEMPLATE_ID'` → votre Template ID  
- `'YOUR_PUBLIC_KEY'` → votre Public Key
- `'contact@neira.fr'` → votre vraie adresse email

### 6. Tester
1. Redémarrez le serveur de développement
2. Allez sur la page de contact
3. Envoyez un message de test
4. Vérifiez votre boîte email !

## Exemple de configuration finale

```typescript
await emailjs.send(
  'service_abc123',      // Votre Service ID
  'template_xyz789',     // Votre Template ID
  {
    from_name: `${formData.firstName} ${formData.lastName}`,
    from_email: formData.email,
    phone: formData.phone,
    company: formData.company,
    message: formData.message,
    to_email: 'votre-email@gmail.com',
  },
  'abcDEF123ghiJKL'      // Votre Public Key
);
```

## Limites du plan gratuit
- 200 emails/mois
- Parfait pour commencer !
- Possibilité d'upgrade si besoin

## Support
Si vous avez des questions, EmailJS a une excellente documentation : https://www.emailjs.com/docs/
