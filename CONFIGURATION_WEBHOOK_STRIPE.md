# Configuration du Webhook Stripe

## ✅ État actuel

- ✅ Table `invoices` créée dans la base de données
- ✅ Webhook `stripe-webhook-subscriptions` déployé sur Supabase
- ✅ Clé API Resend configurée (`RESEND_API_KEY`)
- ✅ Email de confirmation utilise `contact@neira.fr`
- ✅ Template HTML personnalisé avec logo Neira

## 🔧 Configuration requise dans Stripe Dashboard

### 1. Accéder aux webhooks

1. Connectez-vous à [Stripe Dashboard](https://dashboard.stripe.com/)
2. Allez dans **Développeurs** → **Webhooks**
3. Cliquez sur **Ajouter un endpoint**

### 2. Configurer l'endpoint

**URL du webhook :**
```
https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/stripe-webhook-subscriptions
```

**Version API :** `2024-11-20.acacia`

**Événements à écouter :**
- ✅ `checkout.session.completed` - Paiement réussi, création compte
- ✅ `customer.subscription.updated` - Modification abonnement
- ✅ `customer.subscription.deleted` - Annulation abonnement
- ✅ `invoice.payment_succeeded` - Paiement facture réussi
- ✅ `invoice.payment_failed` - Échec paiement

### 3. Récupérer le signing secret

Après avoir créé le webhook :
1. Copiez le **Signing secret** (commence par `whsec_...`)
2. Ajoutez-le dans Supabase Secrets :

```bash
npx supabase secrets set STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS=whsec_votre_secret_ici
```

### 4. Vérifier l'ancienne URL

Si un webhook existe déjà avec l'URL `/stripe-webhook` (404 dans les logs), **supprimez-le** car il n'est plus utilisé.

## 📧 Fonctionnement de l'envoi d'email

Quand un client complète son paiement (`checkout.session.completed`) :

1. ✅ Le webhook reçoit l'événement Stripe
2. ✅ Récupère les infos du cabinet et de l'abonnement
3. ✅ **Crée la facture** dans la table `invoices`
4. ✅ **Envoie l'email** via Resend avec :
   - Récapitulatif de la commande
   - Lien vers la facture PDF
   - Lien "Accéder à mon espace"
   - Contact : contact@neira.fr

## 🧪 Test de l'envoi d'email

Pour tester l'envoi d'email sans passer par Stripe :

```bash
curl -X POST https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/stripe-webhook-subscriptions \
  -H "Content-Type: application/json" \
  -H "stripe-signature: votre_signature" \
  -d '{"type": "checkout.session.completed", ...}'
```

Ou effectuez un vrai paiement test sur votre page de checkout.

## 📊 Vérification des logs

Pour voir si les emails partent bien :

```bash
npx supabase functions logs stripe-webhook-subscriptions
```

Recherchez :
- ✅ `Email envoyé et facture créée pour: email@example.com`
- ❌ `Erreur envoi email:` (si problème)

## 🔍 Logs actuels détectés

Les logs montrent que Stripe envoie actuellement vers `/stripe-webhook` (404).
→ **Action requise** : Mettre à jour l'URL dans Stripe Dashboard vers `/stripe-webhook-subscriptions`

## 📝 Variables d'environnement nécessaires

Toutes déjà configurées ✅ :
- `RESEND_API_KEY` - Pour l'envoi d'emails
- `STRIPE_SECRET_KEY` - Pour Stripe API
- `STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS` - Pour valider les webhooks
- `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` - Pour la BDD

## 🚀 Prochaines étapes

1. ⚠️ **Mettre à jour l'URL du webhook dans Stripe Dashboard**
2. ⚠️ **Copier le nouveau signing secret dans Supabase**
3. ✅ Effectuer un paiement test
4. ✅ Vérifier que l'email arrive bien
5. ✅ Vérifier que la facture est créée dans la table `invoices`
