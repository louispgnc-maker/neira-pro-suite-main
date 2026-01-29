# 🚨 Fonctionnalités Stripe manquantes - À implémenter

## 📋 Fonctionnalités critiques manquantes

### 1. 🔄 **Changement d'abonnement (Upgrade/Downgrade)**

**Problème :** Actuellement, on peut souscrire mais pas changer de formule.

**Ce qui manque :**
- Edge Function `change-subscription-plan`
- Gestion du prorata (crédit ou charge supplémentaire)
- Interface UI pour changer de plan
- Validation des contraintes (nombre de membres vs limites)

**Impact utilisateur :** ⚠️ **CRITIQUE** - Les utilisateurs ne peuvent pas évoluer vers une formule supérieure ou inférieure.

**Implémentation requise :**

```typescript
// supabase/functions/change-subscription-plan/index.ts
// - Récupérer subscription actuelle
// - Calculer le prorata
// - Mettre à jour subscription_items avec nouveau price_id
// - Gérer les limites (ex: downgrade avec trop de membres)
```

---

### 2. ❌ **Annulation d'abonnement**

**Problème :** Les utilisateurs ne peuvent pas annuler leur abonnement depuis l'app.

**Ce qui manque :**
- Edge Function `cancel-subscription`
- UI de confirmation d'annulation
- Gestion de la période restante (garder accès jusqu'à la fin)
- Flow de rétention (offrir une réduction ?)

**Impact utilisateur :** ⚠️ **CRITIQUE** - Les utilisateurs doivent contacter le support pour annuler.

**Implémentation requise :**

```typescript
// supabase/functions/cancel-subscription/index.ts
// - Options: annulation immédiate ou fin de période
// - Mettre à jour le statut dans la DB
// - Gérer les webhooks d'annulation
```

---

### 3. 🔁 **Réactivation d'abonnement**

**Problème :** Si un abonnement est annulé, pas de moyen de le réactiver.

**Ce qui manque :**
- Edge Function `reactivate-subscription`
- Détection des abonnements annulés
- UI pour proposer la réactivation

**Impact utilisateur :** 🟡 **MOYEN** - Peut créer un nouvel abonnement mais perd l'historique.

---

### 4. 💳 **Gestion des échecs de paiement**

**Problème :** Si un paiement échoue, l'utilisateur n'a pas de flow pour mettre à jour sa carte.

**Ce qui manque :**
- Détection des paiements échoués (`invoice.payment_failed`)
- Email automatique + notification in-app
- Page dédiée pour relancer le paiement
- Compte à rebours avant suspension du compte

**Impact utilisateur :** ⚠️ **CRITIQUE** - Risque de perdre l'accès sans prévenir.

**Implémentation requise :**

```typescript
// Dans stripe-webhook-subscriptions
case 'invoice.payment_failed': {
  // 1. Marquer le cabinet en 'past_due'
  // 2. Envoyer email de relance
  // 3. Créer notification in-app
  // 4. Après 3 échecs → suspendre l'accès
}
```

---

### 5. 🎟️ **Codes promo et réductions**

**Problème :** Pas de système de coupons pour offrir des réductions.

**Ce qui manque :**
- Intégration Stripe Coupons
- UI pour saisir un code promo au checkout
- Gestion des réductions (%, montant fixe)
- Suivi des codes utilisés

**Impact utilisateur :** 🟢 **FAIBLE** - Nice to have pour marketing.

**Implémentation :**

```typescript
// Dans create-subscription-checkout
sessionParams.discounts = [{
  coupon: 'PROMO10' // 10% de réduction
}]
```

---

### 6. 🎁 **Essai gratuit (Trial)**

**Problème :** Pas de période d'essai gratuite pour tester la plateforme.

**Ce qui manque :**
- Configuration trial period (ex: 14 jours)
- UI pour activer le trial
- Email de rappel avant fin du trial
- Auto-activation de l'abonnement après trial

**Impact utilisateur :** 🟡 **MOYEN** - Bon pour la conversion.

**Implémentation :**

```typescript
// Dans create-subscription-checkout
subscription_data: {
  trial_period_days: 14,
  trial_settings: {
    end_behavior: {
      missing_payment_method: 'cancel'
    }
  }
}
```

---

### 7. 💰 **Remboursements**

**Problème :** Pas de système de remboursement côté admin.

**Ce qui manque :**
- Edge Function `create-refund`
- Interface admin pour gérer les remboursements
- Partiel ou total
- Mise à jour des crédits/accès

**Impact utilisateur :** 🟡 **MOYEN** - Géré manuellement via Stripe Dashboard pour l'instant.

---

### 8. 🌍 **Taxes internationales**

**Problème :** Pas de gestion automatique de la TVA selon les pays.

**Ce qui manque :**
- Configuration Stripe Tax
- Collecte du numéro de TVA
- Calcul automatique de la TVA
- Reverse charge pour B2B UE

**Impact utilisateur :** ⚠️ **CRITIQUE** si expansion internationale.

**Implémentation :**

```typescript
// Dans create-subscription-checkout
automatic_tax: {
  enabled: true
}
```

---

### 9. 📧 **Emails transactionnels**

**Problème :** Pas d'emails personnalisés pour les événements de paiement.

**Ce qui manque :**
- Email de confirmation d'abonnement
- Email de facture mensuelle
- Email d'échec de paiement
- Email d'annulation
- Email de renouvellement

**Impact utilisateur :** 🟡 **MOYEN** - Stripe envoie des emails par défaut mais pas brandés.

---

### 10. 📊 **Dashboard analytics paiements**

**Problème :** Pas de vue d'ensemble des revenus et métriques.

**Ce qui manque :**
- MRR (Monthly Recurring Revenue)
- Churn rate
- Nouveaux abonnés vs désabonnés
- Revenus par formule
- Taux de conversion

**Impact utilisateur :** 🟢 **FAIBLE** - Plus pour l'admin que pour les utilisateurs.

---

### 11. 🔔 **Notifications in-app**

**Problème :** Les utilisateurs ne sont pas notifiés des événements de paiement dans l'app.

**Ce qui manque :**
- Système de notifications in-app
- Badge de notification
- Centre de notifications
- Notifications pour :
  - Paiement réussi
  - Paiement échoué
  - Fin de période d'essai
  - Renouvellement proche
  - Changement de plan

**Impact utilisateur :** 🟡 **MOYEN** - Améliore l'UX.

---

### 12. 📄 **Génération de devis**

**Problème :** Pas de système de devis avant paiement pour les grandes structures.

**Ce qui manque :**
- Génération de devis PDF
- Envoi par email
- Validation et conversion en facture
- Suivi des devis

**Impact utilisateur :** 🟢 **FAIBLE** - Nice to have pour B2B.

---

### 13. 🔒 **Suspension temporaire**

**Problème :** Pas de possibilité de suspendre temporairement un abonnement (vacances, etc.)

**Ce qui manque :**
- Edge Function `pause-subscription`
- UI pour suspendre/reprendre
- Gestion de la période de suspension
- Pas de charge pendant la pause

**Impact utilisateur :** 🟢 **FAIBLE** - Feature avancée.

---

### 14. 👥 **Gestion des sièges (seats)**

**Problème :** L'ajout de membres met à jour automatiquement la quantity, mais pas de vue claire des coûts.

**Ce qui manque :**
- Prévision du coût avant d'ajouter un membre
- Simulation de changement de plan
- Optimisation des coûts (proposer un plan adapté)

**Impact utilisateur :** 🟡 **MOYEN** - Évite les surprises sur la facture.

---

### 15. 🎫 **Achats groupés de signatures**

**Problème :** Système de signatures existe, mais pas d'optimisation pour achats récurrents.

**Ce qui manque :**
- Abonnement récurrent pour signatures (ex: 100 signatures/mois)
- Auto-recharge quand quota atteint
- Notifications de quota bas

**Impact utilisateur :** 🟡 **MOYEN** - Évite les ruptures de service.

---

## 🎯 Priorités d'implémentation

### 🔴 **URGENT (À faire maintenant)**

1. ✅ **Changement d'abonnement** (upgrade/downgrade)
2. ✅ **Annulation d'abonnement**
3. ✅ **Gestion des échecs de paiement**

### 🟡 **IMPORTANT (Court terme)**

4. ✅ **Essai gratuit**
5. ✅ **Réactivation d'abonnement**
6. ✅ **Notifications in-app pour paiements**
7. ✅ **Gestion des sièges (prévision coûts)**

### 🟢 **NICE TO HAVE (Moyen terme)**

8. ✅ **Codes promo**
9. ✅ **Taxes internationales**
10. ✅ **Emails transactionnels personnalisés**

### ⚪ **AVANCÉ (Long terme)**

11. ✅ **Dashboard analytics**
12. ✅ **Génération de devis**
13. ✅ **Suspension temporaire**
14. ✅ **Achats groupés signatures**
15. ✅ **Remboursements (admin)**

---

## 💡 Recommandation

**Pour avoir un système de paiement complet et production-ready, il faut au minimum implémenter les 3 fonctionnalités URGENTES :**

1. **Changement d'abonnement** - Sinon les clients sont bloqués
2. **Annulation** - Obligatoire pour la conformité légale
3. **Gestion des échecs de paiement** - Évite les pertes de revenus

Le reste peut être ajouté progressivement selon les retours utilisateurs.

---

## 📦 Ordre d'implémentation suggéré

**Semaine 1 : Changement de plan**
- Edge Function change-subscription-plan
- UI dans page Subscription
- Tests

**Semaine 2 : Annulation**
- Edge Function cancel-subscription
- Flow de rétention
- UI confirmation

**Semaine 3 : Échecs de paiement**
- Amélioration webhook
- Emails de relance
- Page de mise à jour carte

**Semaine 4 : Essai gratuit + Notifications**
- Configurer trial period
- Système de notifications
- Emails

---

Voulez-vous que je commence à implémenter les 3 fonctionnalités urgentes ?
