# Configuration Webhook Stripe pour Reset Mensuel des Signatures

## 🎯 Objectif

Réinitialiser automatiquement les quotas de signatures électroniques de chaque utilisateur à chaque date de facturation mensuelle.

## 📋 Principe

- **Avant** : 1er janvier, tu as 40 signatures dans ton plan Pro
- Tu les utilises toutes avant le 1er février
- **Le 1er février** : Stripe envoie un `invoice.paid` → webhook reset automatique
- **Après** : Tu as de nouveau 40 signatures disponibles pour février

## 🔧 Configuration dans Stripe Dashboard

### 1. Créer le Webhook

1. Aller sur [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Cliquer sur **"Add endpoint"**
3. URL du endpoint :
   ```
   https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/stripe-billing-webhook
   ```

### 2. Événements à écouter

Sélectionner uniquement :
- ✅ `invoice.paid` - Déclenché à chaque paiement mensuel réussi

### 3. Récupérer le Secret

1. Après création, copier le **Webhook signing secret** (commence par `whsec_...`)
2. L'ajouter dans Supabase :
   - Aller sur [Supabase Dashboard > Project Settings > Edge Functions](https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/settings/functions)
   - Ajouter le secret : `STRIPE_WEBHOOK_SECRET_BILLING=whsec_xxx`

## 🔄 Workflow Automatique

```
Stripe détecte paiement mensuel
         ↓
  Envoie invoice.paid
         ↓
  Webhook Supabase reçoit
         ↓
  Identifie le cabinet via stripe_customer_id
         ↓
  Appelle handle_billing_cycle_reset(cabinet_id)
         ↓
  Reset signatures_last_reset_at = NOW()
         ↓
  ✅ Quotas mensuels réinitialisés
```

## 🧪 Test Manuel

Pour tester sans attendre la facturation réelle :

```sql
-- Reset manuel pour un cabinet spécifique
SELECT handle_billing_cycle_reset('cabinet-uuid-ici');

-- Reset pour tous les cabinets (simule le cycle mensuel)
SELECT reset_monthly_signatures();
```

## 📊 Vérification

Après un paiement Stripe, vérifier que :

```sql
-- La date de reset a été mise à jour
SELECT 
  cm.user_id,
  cm.signatures_last_reset_at,
  c.subscription_started_at
FROM cabinet_members cm
JOIN cabinets c ON c.id = cm.cabinet_id
WHERE c.id = 'cabinet-uuid';
```

## ⚡ Variables d'environnement requises

Dans Supabase Edge Functions :
- `STRIPE_SECRET_KEY` - Clé API Stripe (déjà configurée)
- `STRIPE_WEBHOOK_SECRET_BILLING` - Secret webhook pour invoice.paid (**À AJOUTER**)
- `SUPABASE_URL` - Auto fournie
- `SUPABASE_SERVICE_ROLE_KEY` - Auto fournie

## 🎯 Résultat

Les utilisateurs récupèrent automatiquement leurs 15/40/100 signatures mensuelles à chaque date anniversaire de leur abonnement, sans intervention manuelle ! 🎉
