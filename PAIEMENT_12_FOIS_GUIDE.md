# 💳 Système de Paiement en 12 Fois avec Engagement

## 📋 Vue d'ensemble

Les trois abonnements (Essentiel, Professionnel, Cabinet+) sont maintenant configurés avec :

✅ **Engagement ferme de 12 mois**  
✅ **Paiement en une fois (annuel)** avec -10% de réduction  
✅ **Paiement en 12 fois (mensuel)** au même prix que l'annuel

### Fonctionnement du paiement mensuel (12 fois)

Quand un client choisit le **paiement mensuel** :
- Il paye **45€/mois** (Essentiel) pendant 12 mois
- Les paiements sont prélevés **à la même date chaque mois** (exemple : souscription le 15 janvier → prélèvements les 15 de chaque mois)
- L'abonnement est automatiquement configuré avec `cancel_at` = date + 12 mois
- **L'annulation est bloquée** pendant les 12 mois d'engagement

### Exemple concret

**Client souscrit le 15 janvier 2026 au plan Essentiel (mensuel)** :
- 1er paiement : 15 janvier 2026 → 45€
- 2ème paiement : 15 février 2026 → 45€
- 3ème paiement : 15 mars 2026 → 45€
- ...
- 12ème paiement : 15 décembre 2026 → 45€
- **Total payé : 540€** (45€ × 12)
- Fin d'engagement : 15 janvier 2027

> **Note** : Avec le paiement annuel, le client aurait payé **486€** en une fois (10% de réduction).

---

## 🔧 Modifications Techniques

### 1. Edge Function : `create-subscription-checkout`

**Fichier** : `supabase/functions/create-subscription-checkout/index.ts`

**Changements** :
- Accepte `metadata.billing_period` pour déterminer si c'est mensuel ou annuel
- Pour les abonnements **mensuels**, ajoute automatiquement `cancel_at` à 12 mois
- Enregistre `commitment_end_date` dans les metadata

```typescript
// Calculer la date de fin d'engagement (12 mois)
const commitmentEndDate = new Date()
commitmentEndDate.setMonth(commitmentEndDate.getMonth() + 12)
const commitmentEndTimestamp = Math.floor(commitmentEndDate.getTime() / 1000)

subscription_data: {
  // Pour les abonnements mensuels uniquement
  ...(isMonthly ? { cancel_at: commitmentEndTimestamp } : {}),
  metadata: {
    commitment_end_date: commitmentEndDate.toISOString(),
    billing_period: billingPeriod,
  }
}
```

### 2. Webhook : `stripe-webhook-subscriptions`

**Fichier** : `supabase/functions/stripe-webhook-subscriptions/index.ts`

**Changements** :
- Récupère `commitment_end_date` depuis les metadata de la subscription ou session
- Enregistre dans la table `cabinets` :
  - `billing_period` : 'monthly' ou 'yearly'
  - `subscription_commitment_end_date` : date de fin d'engagement
  - `subscription_commitment_months` : 12

```typescript
// Priorité aux metadata existantes
let commitmentEndDate: Date;
if (subscription.metadata?.commitment_end_date) {
  commitmentEndDate = new Date(subscription.metadata.commitment_end_date);
} else if (session.metadata?.commitment_end_date) {
  commitmentEndDate = new Date(session.metadata.commitment_end_date);
} else {
  // Fallback : calculer 12 mois depuis le début
  const startDate = new Date(subscription.started_at * 1000);
  commitmentEndDate = new Date(startDate);
  commitmentEndDate.setMonth(commitmentEndDate.getMonth() + 12);
}
```

### 3. Nouvelle Edge Function : `cancel-subscription`

**Fichier** : `supabase/functions/cancel-subscription/index.ts`

**Fonction** :
- Vérifie que l'utilisateur est manager/owner du cabinet
- **Bloque l'annulation si l'engagement n'est pas terminé**
- Retourne un message clair avec la date de fin d'engagement
- Si l'engagement est terminé, autorise l'annulation

**Réponse en cas de blocage** :
```json
{
  "error": "engagement_not_completed",
  "message": "Vous êtes encore sous engagement jusqu'au 15 janvier 2027 (environ 11 mois restants). L'annulation n'est pas autorisée pendant cette période.",
  "commitmentEndDate": "2027-01-15T00:00:00.000Z",
  "remainingMonths": 11
}
```

### 4. Configuration du Portail Stripe

**Fichier** : `configure-stripe-portal-no-cancel.mjs`

**Configuration** :
- ❌ **Annulation désactivée** dans le portail client Stripe
- ❌ **Changement de plan désactivé** (géré par l'application)
- ✅ **Mise à jour du moyen de paiement autorisée**
- ✅ **Historique des factures accessible**

---

## 📊 Comparaison Mensuel vs Annuel

| Formule | Prix Mensuel | Prix Annuel | Total 12 mois (mensuel) | Économie annuelle |
|---------|--------------|-------------|-------------------------|-------------------|
| **Essentiel** | 45€/mois | 486€/an | 540€ | 54€ (10%) |
| **Professionnel** | 69€/mois/membre | 745€/an/membre | 828€/membre | 83€ (10%) |
| **Cabinet+** | 99€/mois/membre | 1069€/an/membre | 1188€/membre | 119€ (10%) |

---

## 🚀 Déploiement

### 1. Déployer la fonction cancel-subscription

```bash
chmod +x deploy-cancel-subscription.sh
./deploy-cancel-subscription.sh
```

### 2. Configurer le portail Stripe (bloquer annulations)

```bash
node configure-stripe-portal-no-cancel.mjs
```

### 3. Tester le flow

1. **Créer un abonnement mensuel**
   - Aller sur `/checkout/essentiel`
   - Choisir "Mensuel"
   - Finaliser le paiement

2. **Vérifier dans Stripe Dashboard**
   - La subscription doit avoir `cancel_at` = date + 12 mois
   - Les metadata doivent contenir `commitment_end_date`

3. **Tester le blocage d'annulation**
   - Essayer d'annuler avant 12 mois → doit être bloqué
   - Vérifier le message d'erreur avec la date de fin d'engagement

---

## ✅ Points de contrôle

- [x] Abonnements mensuels ont `cancel_at` à 12 mois
- [x] Webhook enregistre `commitment_end_date` et `billing_period`
- [x] Edge function `cancel-subscription` bloque les annulations prématurées
- [x] Portail Stripe désactive les annulations
- [x] Messages d'erreur clairs pour les utilisateurs
- [x] Les paiements mensuels se font à date fixe (15 jan → 15 fév → ...)

---

## 🔐 Sécurité

1. **Côté Stripe** : `cancel_at` empêche la prolongation automatique après 12 mois
2. **Côté Portail** : Annulation désactivée dans l'interface Stripe
3. **Côté Serveur** : Edge function vérifie `commitment_end_date` avant toute annulation
4. **Côté Application** : Permissions vérifiées (manager/owner uniquement)

---

## 📝 Notes importantes

### Pour les abonnements mensuels :
- Stripe facture automatiquement **le même jour chaque mois** (exemple : 15 du mois)
- Si le mois n'a pas ce jour (ex: 31 février), Stripe facture le dernier jour du mois
- L'engagement est calculé en **mois calendaires** (12 mois = 1 an)

### Pour les abonnements annuels :
- Paiement en une fois à la souscription
- -10% de réduction automatique
- Même engagement de 12 mois (renouvellement automatique à la fin)

### Upgrade/Downgrade pendant l'engagement :
- ✅ **Upgrade autorisé** à tout moment (prorata calculé par Stripe)
- ❌ **Downgrade bloqué** pendant les 12 mois d'engagement
- La logique de blocage existe déjà dans `Subscription.tsx`

---

## 🎯 Avantages de cette implémentation

1. ✅ **Respect strict de l'engagement** : Impossible d'annuler avant 12 mois
2. ✅ **Flexibilité de paiement** : Mensuel ou annuel au choix du client
3. ✅ **Automatique** : Stripe gère les prélèvements mensuels
4. ✅ **Dates fixes** : Paiements le même jour chaque mois (mois compté)
5. ✅ **Sécurisé** : Triple protection (Stripe + Portail + Serveur)
6. ✅ **Transparent** : Messages clairs pour les utilisateurs

---

## 🔄 Mise à jour d'un abonnement existant

Si un client veut passer de mensuel à annuel (ou inversement) :

```typescript
// Dans l'application
const { data, error } = await supabase.functions.invoke('update-subscription-billing', {
  body: {
    cabinetId: 'xxx',
    newBillingPeriod: 'yearly' // ou 'monthly'
  }
})
```

> **Note** : Cette fonction n'existe pas encore. À créer si besoin.
