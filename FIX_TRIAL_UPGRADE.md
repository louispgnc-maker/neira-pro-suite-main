# 🎯 Correction : Période d'essai lors des upgrades

## ❌ Problème identifié

Lorsqu'un utilisateur upgrade son abonnement pendant la période d'essai (jour 1 → jour 4), le système créait une **nouvelle session de checkout** avec **7 nouveaux jours d'essai**, permettant ainsi d'avoir 11 jours au lieu de 7.

## ✅ Solution implémentée

### 1. Nouvelle Edge Function : `update-subscription-plan`

**Fichier** : `supabase/functions/update-subscription-plan/index.ts`

Cette fonction :
- ✅ Met à jour l'abonnement existant au lieu d'en créer un nouveau
- ✅ **Conserve la date de fin d'essai originale** (`trial_end`)
- ✅ Pas de prorata pendant l'essai (`proration_behavior: 'none'`)
- ✅ Prorata normal hors période d'essai
- ✅ **Met à jour immédiatement la BDD** (sans attendre le webhook)

**Code clé** :
```typescript
// Mettre à jour le plan
await stripe.subscriptionItems.update(subscriptionItemId, {
  price: newPriceId,
  quantity: quantity,
})

// Si en période d'essai, CONSERVER la date de fin d'essai
if (isInTrial && trialEnd) {
  await stripe.subscriptions.update(subscriptionId, {
    trial_end: trialEnd, // ✅ MÊME DATE
    proration_behavior: 'none',
  })
}

// ✅ Mettre à jour immédiatement la BDD
await supabaseAdmin
  .from('cabinets')
  .update({
    subscription_plan: tier,
    max_members: quantity,
  })
  .eq('id', cabinetId)
```

### 2. Frontend mis à jour

**Fichier** : `src/components/subscription/ChangePlanModal.tsx`

Avant :
```typescript
// ❌ Créait une nouvelle session avec 7 nouveaux jours
const checkoutUrl = await createStripeCheckoutSession({ ... })
window.location.replace(checkoutUrl)
```

Après :
```typescript
// ✅ Met à jour l'abonnement existant
const { data, error } = await supabase.functions.invoke('update-subscription-plan', {
  body: {
    cabinetId,
    newPriceId: priceId,
    quantity: numberOfMembers,
  },
})
```

## 🎯 Comportement attendu

### Scénario test :
1. **Jour 1** : Souscription plan Essentiel → Début essai (fin le jour 8)
2. **Jour 4** : Upgrade vers Professionnel
3. **Résultat** : L'essai se termine toujours le **jour 8** (pas de réinitialisation)

### Tableau récapitulatif :

| Action | Ancien comportement | Nouveau comportement |
|--------|-------------------|---------------------|
| Upgrade pendant essai | Nouvel essai de 7 jours ❌ | Garde la même date de fin ✅ |
| Upgrade hors essai | Prorata appliqué ✅ | Prorata appliqué ✅ |
| Downgrade pendant essai | Possible | Possible |
| Downgrade hors essai | Bloqué (12 mois) | Bloqué (12 mois) |

## 📦 Déploiement

```bash
chmod +x deploy-update-subscription-plan.sh
./deploy-update-subscription-plan.sh
```

## ✅ Tests à effectuer

1. **Test 1** : Créer un abonnement Essentiel
   - Vérifier la date de fin d'essai dans Stripe Dashboard
   
2. **Test 2** : Upgrade vers Professionnel le jour 3
   - Vérifier que `trial_end` n'a pas changé
   - Confirmer qu'aucun nouveau paiement n'est créé
   
3. **Test 3** : Attendre la fin de l'essai
   - Vérifier que le premier paiement se fait au jour 8 (plan Professionnel)

## 🔒 Sécurité

- ✅ Vérification que seul le Fondateur peut modifier l'abonnement
- ✅ Authentification JWT requise
- ✅ Validation des paramètres
- ✅ Logs détaillés pour le débogage

## 📊 Webhooks impactés

Le webhook `stripe-webhook-subscriptions` continuera de fonctionner normalement car :
- Il gère déjà `customer.subscription.updated`
- Il détecte automatiquement le changement de plan
- Il met à jour la BDD avec le nouveau plan

---

**Date** : 10 février 2026
**Auteur** : Copilot
**Statut** : ✅ Prêt pour déploiement
