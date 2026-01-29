# 🚀 Configuration Complète Stripe - Guide Étape par Étape

## ✅ Ce qui est déjà fait (code)

- ✅ Edge functions déployées
- ✅ Prorata pour ajout de membres
- ✅ Reset mensuel automatique des signatures
- ✅ Limites correctes appliquées
- ✅ Packs de signatures configurés

## 🔧 Ce qu'il faut configurer dans Stripe

### 1️⃣ Créer les Produits et Prix dans Stripe Dashboard

Aller sur [Stripe Dashboard > Products](https://dashboard.stripe.com/products)

#### **A. Plan Essentiel**
1. Cliquer **"Add product"**
2. Nom : `Neira - Plan Essentiel`
3. Description : `Plan Essentiel pour professionnels indépendants • 20 Go • 100 dossiers • 30 clients • 15 signatures/mois`
4. Prix :
   - **Mensuel** : 45€/mois récurrent
   - **Annuel** : 486€/an récurrent (45€ × 12 × 0.9)
5. Copier les **Price IDs** :
   - `price_xxx_monthly` → pour STRIPE_PRICE_IDS.essentiel.monthly
   - `price_xxx_yearly` → pour STRIPE_PRICE_IDS.essentiel.yearly

#### **B. Plan Professionnel**
1. Cliquer **"Add product"**
2. Nom : `Neira - Plan Professionnel`
3. Description : `Plan Pro pour cabinets 2-10 utilisateurs • 100 Go • 600 dossiers • 200 clients • 40 signatures/mois/utilisateur`
4. Prix :
   - **Mensuel** : 69€/mois/utilisateur récurrent (facturé par siège)
   - **Annuel** : 745€/an/utilisateur récurrent (69€ × 12 × 0.9)
5. ⚠️ Configurer **Metered billing** :
   - Usage type : **Licensed**
   - Billing period : **Monthly** ou **Yearly**
6. Copier les **Price IDs**

#### **C. Plan Cabinet+**
1. Cliquer **"Add product"**
2. Nom : `Neira - Plan Cabinet+`
3. Description : `Plan illimité pour cabinets 10-50+ utilisateurs • Tout illimité • 100 signatures/mois/utilisateur`
4. Prix :
   - **Mensuel** : 99€/mois/utilisateur récurrent
   - **Annuel** : 1069€/an/utilisateur récurrent (99€ × 12 × 0.9)
5. ⚠️ Configurer **Metered billing** (facturé par siège)
6. Copier les **Price IDs**

#### **D. Packs de Signatures**
Créer 6 produits de paiement unique (one-time) :

1. **Urgence** : 1 signature - 3€
2. **Mini** : 10 signatures - 20€
3. **Starter** : 25 signatures - 30€
4. **Pro** : 50 signatures - 45€
5. **Business** : 100 signatures - 70€
6. **Enterprise** : 250 signatures - 140€

Pour chaque pack :
- Type : **One-time payment** (pas récurrent)
- Copier le **Price ID**

---

### 2️⃣ Mettre à jour les Price IDs dans le code

Éditer `src/lib/stripeConfig.ts` :

```typescript
export const STRIPE_PRICE_IDS = {
  essentiel: {
    monthly: 'price_XXXXX', // ← Remplacer par vrai ID Stripe
    yearly: 'price_XXXXX'
  },
  professionnel: {
    monthly: 'price_XXXXX',
    yearly: 'price_XXXXX'
  },
  'cabinet-plus': {
    monthly: 'price_XXXXX',
    yearly: 'price_XXXXX'
  }
};

export const SIGNATURE_PACK_PRICE_IDS = {
  urgence_1: 'price_XXXXX',
  mini_10: 'price_XXXXX',
  starter_25: 'price_XXXXX',
  pro_50: 'price_XXXXX',
  business_100: 'price_XXXXX',
  enterprise_250: 'price_XXXXX'
};
```

Commit et push :
```bash
git add src/lib/stripeConfig.ts
git commit -m "🔧 Ajout Price IDs Stripe"
git push
```

---

### 3️⃣ Configurer les Webhooks Stripe

#### **A. Webhook pour les paiements principaux**

1. Aller sur [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Cliquer **"Add endpoint"**
3. URL : `https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/stripe-webhook`
4. Événements à écouter :
   - ✅ `checkout.session.completed` - Nouvel abonnement
   - ✅ `customer.subscription.updated` - Changement d'abonnement
   - ✅ `customer.subscription.deleted` - Annulation
   - ✅ `invoice.payment_succeeded` - Paiement réussi
   - ✅ `invoice.payment_failed` - Paiement échoué
5. Copier le **Webhook signing secret** (commence par `whsec_`)

#### **B. Webhook pour reset mensuel signatures**

1. Cliquer **"Add endpoint"**
2. URL : `https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/stripe-billing-webhook`
3. Événements :
   - ✅ `invoice.paid` - Reset mensuel des signatures
4. Copier le **Webhook signing secret**

---

### 4️⃣ Ajouter les Secrets dans Supabase

Aller sur [Supabase Edge Functions Settings](https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/settings/functions)

Ajouter ces variables d'environnement :

```bash
STRIPE_SECRET_KEY=sk_live_XXXXX  # Clé secrète Stripe (mode live)
STRIPE_PUBLISHABLE_KEY=pk_live_XXXXX  # Clé publique (pour le front)
STRIPE_WEBHOOK_SECRET=whsec_XXXXX  # Secret du webhook principal
STRIPE_WEBHOOK_SECRET_BILLING=whsec_XXXXX  # Secret du webhook billing
```

⚠️ **Important** : Utiliser les clés **live** (production) quand prêt, ou **test** pour les tests

---

### 5️⃣ Mettre à jour les variables d'environnement frontend

Créer/éditer `.env` à la racine :

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXX
VITE_SUPABASE_URL=https://elysrdqujzlbvnjfilvh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...  # Déjà configuré
```

---

### 6️⃣ Tester le Workflow Complet

#### **Test 1 : Souscription Plan Essentiel**
1. Aller sur `/checkout-essentiel`
2. Remplir le formulaire
3. Utiliser carte test : `4242 4242 4242 4242` (expire future, n'importe quel CVC)
4. Vérifier que :
   - ✅ L'abonnement est créé dans Stripe
   - ✅ Le cabinet est créé dans Supabase avec `subscription_plan = 'essentiel'`
   - ✅ Les limites sont appliquées (15 signatures/mois)

#### **Test 2 : Ajout de Membre avec Prorata**
1. Aller sur `/manage-members-count`
2. Passer de 10 → 11 membres
3. Vérifier :
   - ✅ Le prorata s'affiche AVANT validation (ex: 80€)
   - ✅ Après validation, Stripe facture le prorata
   - ✅ Le nouveau prix mensuel s'applique (1287€/mois)

#### **Test 3 : Achat Pack Signatures**
1. Aller sur la page Signatures
2. Cliquer "Acheter des signatures"
3. Choisir un pack (ex: Pro 50 signatures - 45€)
4. Vérifier :
   - ✅ Paiement unique (pas récurrent)
   - ✅ Les signatures sont ajoutées au compteur

#### **Test 4 : Reset Mensuel Signatures**
1. Attendre la date de facturation mensuelle
2. Vérifier que :
   - ✅ Stripe envoie `invoice.paid`
   - ✅ Le webhook reset les signatures
   - ✅ Le compteur repasse à 0/40

---

### 7️⃣ Activer le Mode Live

Quand tout fonctionne en test :

1. Dans Stripe Dashboard, basculer en **Live mode** (toggle en haut à droite)
2. Récupérer les nouvelles clés **live** :
   - `sk_live_...`
   - `pk_live_...`
3. Mettre à jour les secrets Supabase et `.env`
4. Redéployer les edge functions :
   ```bash
   npx supabase functions deploy update-subscription-quantity
   npx supabase functions deploy stripe-billing-webhook
   ```

---

## 🎯 Checklist Finale

- [ ] Produits créés dans Stripe (Essentiel, Pro, Cabinet+)
- [ ] Packs signatures créés (6 produits one-time)
- [ ] Price IDs copiés dans `stripeConfig.ts`
- [ ] Webhooks configurés (2 endpoints)
- [ ] Secrets ajoutés dans Supabase
- [ ] Variables d'environnement frontend configurées
- [ ] Test checkout Essentiel ✅
- [ ] Test ajout membre avec prorata ✅
- [ ] Test achat pack signatures ✅
- [ ] Test reset mensuel (attendre facturation) ✅
- [ ] Basculer en mode Live
- [ ] Tester un vrai paiement

---

## 🆘 Problèmes Courants

**Erreur "Invalid price ID"**
→ Vérifier que les Price IDs dans `stripeConfig.ts` correspondent à ceux dans Stripe

**Webhook ne reçoit rien**
→ Vérifier l'URL du webhook et que les événements sont bien cochés

**Prorata incorrect**
→ Vérifier que `subscription_started_at` est bien renseigné dans la table `cabinets`

**Signatures ne se réinitialisent pas**
→ Vérifier que le webhook `invoice.paid` est bien configuré et reçu

---

**Prêt à démarrer ?** Commence par l'étape 1 : créer les produits dans Stripe ! 🚀
