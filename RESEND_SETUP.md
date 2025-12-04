# 🚀 Configuration Resend - 3 minutes chrono

Resend est bien meilleur qu'EmailJS : plus simple, plus fiable, meilleur deliverability, et gratuit jusqu'à 3000 emails/mois !

---

## ✅ Checklist rapide

- [ ] Créer un compte Resend (gratuit)
- [ ] Obtenir la clé API
- [ ] Configurer le domaine (optionnel mais recommandé)
- [ ] Ajouter la clé dans Supabase
- [ ] Tester l'envoi

---

## 📧 Étape 1 : Créer un compte Resend (1 minute)

1. **Allez sur Resend**
   👉 https://resend.com/signup

2. **Créez votre compte**
   - Email professionnel recommandé
   - Vérifiez votre email
   - Connexion

---

## 🔑 Étape 2 : Obtenir la clé API (30 secondes)

1. **Dans le dashboard Resend**
   👉 https://resend.com/api-keys

2. **Créer une nouvelle clé API**
   - Cliquez sur **"Create API Key"**
   - Nom : `Neira Pro Suite - Production`
   - Permission : **"Sending access"** (suffisant)
   - Cliquez sur **"Add"**

3. **Copier la clé API**
   - Format : `re_xxxxxxxxxxxxx`
   - ⚠️ **Important** : Copiez-la maintenant, elle ne sera plus visible après !

---

## 🌐 Étape 3 : Configurer le domaine (optionnel - 5 minutes)

**Pourquoi ?** Pour envoyer depuis `noreply@votre-cabinet.fr` au lieu de `noreply@neira.fr`

### 3.1 Ajouter votre domaine
1. Allez sur https://resend.com/domains
2. Cliquez sur **"Add Domain"**
3. Entrez votre domaine : `votre-cabinet.fr`

### 3.2 Configurer les DNS
Resend vous donnera 3 enregistrements DNS à ajouter :
- **SPF** (TXT)
- **DKIM** (TXT)
- **DMARC** (TXT)

Ajoutez-les chez votre hébergeur DNS (OVH, Cloudflare, etc.)

### 3.3 Vérifier
- Attendez 5-10 minutes
- Resend vérifie automatiquement
- Statut "Verified" ✅

**💡 Astuce :** Vous pouvez utiliser le domaine par défaut `noreply@neira.fr` en attendant !

---

## 🔧 Étape 4 : Configurer Supabase (1 minute)

1. **Allez dans Supabase**
   👉 https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/settings/functions

2. **Ajouter le secret**
   - Section **"Edge Functions Secrets"**
   - Cliquez sur **"Add new secret"**

| Secret Name | Value | Example |
|-------------|-------|---------|
| `RESEND_API_KEY` | Votre clé API Resend | `re_123abc456def...` |

3. **Sauvegarder**
   - Cliquez sur **"Save"**

---

## 🧪 Étape 5 : Tester (30 secondes)

### 5.1 Déployer la fonction Edge
```bash
cd /Users/louispgnc/Desktop/neira-pro-suite-main
supabase functions deploy send-client-form
```

### 5.2 Tester dans l'application
1. Allez dans **Clients**
2. Cliquez sur **"Créer un lien de formulaire client"**
3. Entrez VOTRE email et votre nom
4. Cliquez sur **"Générer le lien"**

### 5.3 Vérifier
**✅ Si tout fonctionne :**
- Message vert : "Email envoyé avec succès !"
- Vous recevez l'email en moins d'1 minute
- L'email arrive directement dans la boîte de réception (pas de spam)

**⚠️ Si problème :**
- Message orange : "Lien du formulaire généré"
- Vérifiez que la clé API est bien configurée dans Supabase
- Vérifiez les logs : `supabase functions logs send-client-form`

---

## 📊 Quotas Resend

### Plan Gratuit (Free)
- ✅ **3 000 emails/mois** (vs 200 pour EmailJS)
- ✅ 1 domaine personnalisé
- ✅ Support par email
- ✅ Deliverability excellente
- ✅ Analytics basiques

### Plan Pro (20$/mois)
- ✅ 50 000 emails/mois
- ✅ Domaines illimités
- ✅ Support prioritaire
- ✅ Analytics avancées

**💡 Pour un cabinet :** 3000 emails/mois = ~100 clients/jour → largement suffisant !

---

## 🔍 Vérifier que ça fonctionne

### Logs Supabase
```bash
supabase functions logs send-client-form
```

**Logs OK :**
```
✅ Resend config check: { hasApiKey: true, formUrl: '...', clientEmail: '...' }
✅ Email sent successfully via Resend to: client@example.com
```

**Logs KO :**
```
❌ Resend API key missing
Please configure RESEND_API_KEY in Supabase Edge Functions secrets
```

### Dashboard Resend
👉 https://resend.com/emails
- Voyez tous les emails envoyés
- Statut : Delivered / Bounced / Spam
- Taux d'ouverture (si activé)
- Logs détaillés

---

## 🆚 Resend vs EmailJS

| Critère | Resend | EmailJS |
|---------|--------|---------|
| **Quota gratuit** | 3000/mois | 200/mois |
| **Deliverability** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Moyen |
| **Configuration** | 1 clé API | 3 IDs + template |
| **Template** | Code direct | Interface web |
| **Spam score** | Très faible | Plus élevé |
| **Analytics** | Incluses | Basiques |
| **Domaine custom** | Oui (gratuit) | Non (payant) |
| **API** | Moderne (REST) | Ancienne |

**🏆 Verdict :** Resend est clairement supérieur pour un usage professionnel.

---

## ❓ FAQ

### L'email arrive en spam
1. ✅ Configurez votre propre domaine (étape 3)
2. ✅ Ajoutez les enregistrements SPF/DKIM/DMARC
3. ✅ Attendez 24-48h pour la réputation du domaine

### Comment changer l'expéditeur ?
Modifiez la ligne dans `send-client-form/index.ts` :
```typescript
from: 'Mon Cabinet <noreply@mon-cabinet.fr>',
```

### Comment personnaliser l'email ?
Le template HTML est directement dans le code de la fonction Edge.
Modifiez-le dans `send-client-form/index.ts` (lignes 70-130).

### Puis-je tester sans domaine custom ?
Oui ! Utilisez `onboarding@resend.dev` pour les tests.
Pour la production, configurez votre domaine.

### Combien coûte Resend ?
- **Gratuit** : 3000 emails/mois
- **Pro** : 20$/mois pour 50 000 emails
- **Échelle** : Prix dégressifs au-delà

---

## 🎯 Résultat final

Une fois configuré :
1. ✅ Vous créez un formulaire client
2. ✅ Email automatique envoyé instantanément
3. ✅ Deliverability excellente (boîte de réception, pas spam)
4. ✅ Client reçoit un email professionnel
5. ✅ Client remplit le formulaire
6. ✅ Fiche créée automatiquement

🎉 **Simple, rapide, et professionnel !**

---

## 🔗 Liens utiles

- **Dashboard Resend** : https://resend.com/
- **Documentation** : https://resend.com/docs
- **API Reference** : https://resend.com/docs/api-reference
- **Status** : https://resend.com/status
- **Support** : support@resend.com

---

## 🚨 Dépannage

### Erreur "Invalid API key"
→ Vérifiez que la clé commence par `re_` et qu'elle est bien copiée dans Supabase

### Erreur "Domain not verified"
→ Configurez les DNS ou utilisez `onboarding@resend.dev` pour les tests

### Email non reçu
→ Vérifiez le dashboard Resend (section Emails) pour voir le statut

### Limite atteinte
→ Vous avez dépassé 3000 emails/mois. Passez au plan Pro ou attendez le mois prochain.
