# 💳 Guide Complet d'Intégration Stripe Business - Neira

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Configuration initiale](#configuration-initiale)
4. [Architecture](#architecture)
5. [Fonctionnalités](#fonctionnalités)
6. [Webhooks](#webhooks)
7. [Tests](#tests)
8. [Déploiement](#déploiement)
9. [Sécurité](#sécurité)
10. [Résolution de problèmes](#résolution-de-problèmes)

---

## 🎯 Vue d'ensemble

Neira utilise **Stripe Business** pour gérer tous les paiements de la plateforme :

### ✅ Ce qui est intégré

- **Abonnements récurrents** (3 formules : Essentiel, Professionnel, Cabinet+)
- **Paiements one-time** (crédits de signatures électroniques)
- **Multi-devises et méthodes de paiement** (Carte, SEPA, Bancontact, iDEAL, etc.)
- **Gestion automatique des quantités** (mise à jour Stripe quand membres ajoutés/supprimés)
- **Webhooks sécurisés** (synchronisation en temps réel)
- **Portail client Stripe** (gestion des moyens de paiement)
- **Historique des paiements** (consultation et téléchargement de factures)

---

## 🔧 Prérequis

### 1. Compte Stripe Business

1. Créez un compte sur [stripe.com](https://stripe.com)
2. Passez en mode **Business** (requis pour fonctionnalités avancées)
3. Activez la facturation européenne (SEPA, etc.)

### 2. Packages npm

Les packages suivants sont déjà installés :

```json
{
  "@stripe/stripe-js": "^latest",
  "@stripe/react-stripe-js": "^latest"
}
```

---

## ⚙️ Configuration initiale

### 1. Récupérer les clés API Stripe

#### Mode Test
```bash
Dashboard Stripe > Developers > API keys
```

- **Clé publique** : `pk_test_...`
- **Clé secrète** : `sk_test_...`

#### Mode Production
- **Clé publique** : `pk_live_...`
- **Clé secrète** : `sk_live_...`

### 2. Créer les produits et prix dans Stripe

#### a) Abonnement Essentiel

```bash
# Produit
stripe products create \
  --name "Neira Essentiel" \
  --description "Idéal pour avocats et notaires indépendants"

# Prix mensuel
stripe prices create \
  --product <PRODUCT_ID> \
  --unit-amount 3900 \
  --currency eur \
  --recurring interval=month

# Prix annuel (10% de réduction)
stripe prices create \
  --product <PRODUCT_ID> \
  --unit-amount 42120 \
  --currency eur \
  --recurring interval=year
```

#### b) Abonnement Professionnel

```bash
# Produit
stripe products create \
  --name "Neira Professionnel" \
  --description "Pour cabinets jusqu'à 10 utilisateurs"

# Prix mensuel (par utilisateur)
stripe prices create \
  --product <PRODUCT_ID> \
  --unit-amount 7500 \
  --currency eur \
  --recurring interval=month
```

#### c) Abonnement Cabinet+

```bash
# Produit
stripe products create \
  --name "Neira Cabinet+" \
  --description "Pour grands cabinets jusqu'à 50 utilisateurs"

# Prix mensuel (par utilisateur)
stripe prices create \
  --product <PRODUCT_ID> \
  --unit-amount 8900 \
  --currency eur \
  --recurring interval=month
```

### 3. Mettre à jour les Price IDs

Dans `src/lib/stripeConfig.ts` :

```typescript
export const STRIPE_PRICE_IDS = {
  essentiel: 'price_VOTRE_PRICE_ID_ESSENTIEL',
  professionnel: 'price_VOTRE_PRICE_ID_PRO',
  'cabinet-plus': 'price_VOTRE_PRICE_ID_CABINET_PLUS',
} as const;
```

### 4. Variables d'environnement Supabase

Dans le dashboard Supabase > Settings > Edge Functions > Secrets :

```bash
STRIPE_SECRET_KEY=sk_test_... # ou sk_live_...
STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS=whsec_...
STRIPE_WEBHOOK_SECRET=whsec_... # Pour signatures
```

---

## 🏗️ Architecture

### Edge Functions Supabase

| Fonction | Description | JWT requis |
|----------|-------------|------------|
| `create-subscription-checkout` | Crée session Stripe pour abonnements | ✅ Oui |
| `create-signature-checkout` | Crée session Stripe pour signatures | ✅ Oui |
| `stripe-webhook-subscriptions` | Webhook pour abonnements | ❌ Non |
| `stripe-webhook-signatures` | Webhook pour signatures | ❌ Non |
| `create-portal-session` | Ouvre portail client Stripe | ✅ Oui |
| `update-subscription-quantity` | Met à jour nb membres | ✅ Oui |
| `get-payment-history` | Récupère historique paiements | ✅ Oui |

### Schéma de base de données

#### Table `cabinets`

```sql
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS stripe_subscription_item_id TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS subscription_tier TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS quantity_members INTEGER DEFAULT 1;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS payment_method_type TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS payment_method_last4 TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS payment_method_brand TEXT;
```

#### Table `cabinet_members`

```sql
ALTER TABLE cabinet_members ADD COLUMN IF NOT EXISTS signature_addon_quantity INTEGER DEFAULT 0;
ALTER TABLE cabinet_members ADD COLUMN IF NOT EXISTS signature_addon_price DECIMAL;
ALTER TABLE cabinet_members ADD COLUMN IF NOT EXISTS signature_addon_purchased_at TIMESTAMPTZ;
ALTER TABLE cabinet_members ADD COLUMN IF NOT EXISTS signature_addon_expires_at TIMESTAMPTZ;
```

---

## 🎨 Fonctionnalités

### 1. Checkout pour abonnements

```typescript
import { createStripeCheckoutSession } from '@/lib/stripeCheckout';
import { STRIPE_PRICE_IDS } from '@/lib/stripeConfig';

const handleCheckout = async () => {
  const checkoutUrl = await createStripeCheckoutSession({
    priceId: STRIPE_PRICE_IDS['cabinet-plus'],
    cabinetId: 'uuid-cabinet',
    quantity: 5, // nombre de membres
    successUrl: `${window.location.origin}/subscription/success`,
    cancelUrl: `${window.location.origin}/subscription`
  });
  
  window.location.href = checkoutUrl;
};
```

### 2. Achat de signatures

```typescript
import { supabase } from '@/lib/supabaseClient';

const buySignatures = async () => {
  const { data } = await supabase.functions.invoke('create-signature-checkout', {
    body: {
      quantity: 75,
      price: 30,
      prorataAmount: 30,
      cabinetId: 'uuid-cabinet',
      targetUserId: 'uuid-user',
      expiresAt: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
      role: 'notaire'
    }
  });
  
  window.location.href = data.url;
};
```

### 3. Portail client (gestion paiements)

```typescript
import { createPortalSession } from '@/lib/stripeCheckout';

const openBillingPortal = async () => {
  const { url } = await createPortalSession(
    stripeCustomerId,
    window.location.href
  );
  window.location.href = url;
};
```

### 4. Historique des paiements

Accédez à la page `/payment-history` pour consulter :
- Tous les paiements (abonnements + signatures)
- Filtres par statut et recherche
- Téléchargement de factures
- Statistiques

---

## 🔔 Webhooks

### Configuration

#### 1. Webhook pour abonnements

**URL**: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook-subscriptions`

**Événements à écouter** :
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.paid`

#### 2. Webhook pour signatures

**URL**: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook-signatures`

**Événements à écouter** :
- `checkout.session.completed`

### Déploiement des webhooks

```bash
# Déployer webhook abonnements
supabase functions deploy stripe-webhook-subscriptions \
  --project-ref YOUR_PROJECT_REF \
  --no-verify-jwt

# Déployer webhook signatures
supabase functions deploy stripe-webhook-signatures \
  --project-ref YOUR_PROJECT_REF \
  --no-verify-jwt
```

⚠️ **Important** : Le flag `--no-verify-jwt` est requis car Stripe n'envoie pas de JWT.

### Récupérer le Webhook Secret

1. Dans Stripe Dashboard > Developers > Webhooks
2. Cliquez sur votre endpoint
3. Section "Signing secret" > Révéler
4. Copiez le `whsec_...`
5. Ajoutez-le dans Supabase Secrets

---

## 🧪 Tests

### Cartes de test Stripe

| Scénario | Numéro | Date | CVC |
|----------|--------|------|-----|
| Paiement réussi | 4242 4242 4242 4242 | 12/28 | 123 |
| Authentification requise | 4000 0025 0000 3155 | 12/28 | 123 |
| Paiement refusé | 4000 0000 0000 9995 | 12/28 | 123 |
| Carte expirée | 4000 0000 0000 0069 | 12/28 | 123 |

### Tester SEPA

- Numéro IBAN : `DE89370400440532013000`
- Les paiements SEPA sont confirmés immédiatement en mode test

### Flux de test complet

1. Créer un compte test
2. Sélectionner un plan (ex: Cabinet+ avec 5 membres)
3. Cliquer sur "Procéder au paiement"
4. Redirection vers Stripe Checkout
5. Utiliser carte test `4242 4242 4242 4242`
6. Valider le paiement
7. ✅ Redirection vers `/subscription/success`
8. ✅ Vérifier que le webhook a mis à jour la DB

### Vérifier les webhooks

```bash
# Dans Stripe Dashboard
Developers > Webhooks > [votre endpoint] > Logs
```

---

## 🚀 Déploiement

### 1. Déployer toutes les Edge Functions

```bash
# Déployer create-subscription-checkout
supabase functions deploy create-subscription-checkout --project-ref YOUR_REF

# Déployer create-signature-checkout
supabase functions deploy create-signature-checkout --project-ref YOUR_REF

# Déployer stripe-webhook-subscriptions
supabase functions deploy stripe-webhook-subscriptions --project-ref YOUR_REF --no-verify-jwt

# Déployer stripe-webhook-signatures
supabase functions deploy stripe-webhook-signatures --project-ref YOUR_REF --no-verify-jwt

# Déployer create-portal-session
supabase functions deploy create-portal-session --project-ref YOUR_REF

# Déployer update-subscription-quantity
supabase functions deploy update-subscription-quantity --project-ref YOUR_REF

# Déployer get-payment-history
supabase functions deploy get-payment-history --project-ref YOUR_REF
```

### 2. Passer en production

1. **Créer les produits en mode Live** dans Stripe
2. **Mettre à jour** `STRIPE_PRICE_IDS` avec les IDs live
3. **Changer** `STRIPE_SECRET_KEY` en `sk_live_...`
4. **Reconfigurer** les webhooks en live
5. **Tester** avec un paiement réel de 1€

---

## 🔒 Sécurité

### Bonnes pratiques appliquées

✅ **Webhook signature vérifiée** (protection contre rejeu)
✅ **Aucune donnée bancaire stockée** (tout géré par Stripe)
✅ **Service Role Key** uniquement côté serveur (webhooks)
✅ **JWT requis** pour toutes les fonctions sauf webhooks
✅ **RLS activé** sur toutes les tables
✅ **HTTPS obligatoire** (Supabase + Stripe)

### Vérifications de sécurité

```typescript
// Vérification signature webhook (dans chaque webhook)
const signature = req.headers.get('stripe-signature')
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

if (!signature || !webhookSecret) {
  return new Response('Missing signature', { status: 400 })
}

const event = stripe.webhooks.constructEvent(
  body, 
  signature, 
  webhookSecret
)
```

---

## 🛠️ Résolution de problèmes

### Problème : Webhook ne fonctionne pas

**Solution** :
1. Vérifier que `STRIPE_WEBHOOK_SECRET` est configuré
2. Vérifier les logs Stripe : Dashboard > Webhooks > [endpoint] > Logs
3. Vérifier les logs Supabase : Dashboard > Edge Functions > Logs
4. S'assurer que `--no-verify-jwt` est utilisé

### Problème : Quantity pas mise à jour

**Solution** :
1. Vérifier que le trigger `trigger_update_stripe_quantity` existe
2. Vérifier les logs de la fonction `update_stripe_quantity()`
3. Appeler manuellement `updateSubscriptionQuantity(cabinetId)`

### Problème : Paiement refusé

**Causes possibles** :
- Carte test incorrecte
- Clé API invalide
- Price ID incorrect
- Customer ID manquant

**Vérifications** :
```typescript
console.log('Price ID:', priceId)
console.log('Customer ID:', customerId)
console.log('Quantity:', quantity)
```

### Problème : Factures non accessibles

**Solution** :
1. Vérifier que `stripe_customer_id` existe dans `cabinets`
2. Vérifier les logs de `get-payment-history`
3. S'assurer que le customer a des paiements

---

## 📊 Métriques et monitoring

### Dashboard Stripe

Suivez les métriques importantes :
- **MRR** (Monthly Recurring Revenue)
- **Churn rate**
- **Paiements échoués**
- **Nouveaux clients**

### Alertes recommandées

1. **Paiement échoué** → Email au client + notification admin
2. **Abonnement annulé** → Enquête de satisfaction
3. **Nouveau client** → Email de bienvenue
4. **Quota signatures atteint** → Proposition d'achat

---

## 📞 Support

### Contacts

- **Stripe Support** : [support.stripe.com](https://support.stripe.com)
- **Documentation Stripe** : [stripe.com/docs](https://stripe.com/docs)
- **Supabase Discord** : [discord.supabase.com](https://discord.supabase.com)

### Ressources utiles

- [Guide Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Guide Webhooks](https://stripe.com/docs/webhooks)
- [Guide Billing Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

---

## ✅ Checklist de déploiement

- [ ] Produits et prix créés dans Stripe
- [ ] Price IDs mis à jour dans le code
- [ ] Variables d'environnement configurées
- [ ] Edge Functions déployées
- [ ] Webhooks configurés et testés
- [ ] Tests effectués avec cartes test
- [ ] Migration en mode Live
- [ ] Test avec paiement réel de 1€
- [ ] Monitoring activé
- [ ] Documentation à jour

---

🎉 **Félicitations !** Votre intégration Stripe Business est complète et sécurisée.
