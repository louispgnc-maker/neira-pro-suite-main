# 🚀 Déploiement - Essai Gratuit 15 jours + Engagement 12 mois

## 📋 Ce qui a été modifié

### 1. Edge Functions
- ✅ `create-subscription-checkout` → Ajout de `trial_period_days: 15`
- ✅ `stripe-webhook-subscriptions` → Gestion du statut `trialing`

### 2. Interface utilisateur
- ✅ Encadré vert "🎁 15 jours d'essai gratuit" sur toutes les pages checkout
- ✅ Texte mis à jour : "Après l'essai : Engagement de 12 mois"

### 3. Configuration Stripe
- ✅ Portail client : Annulation désactivée ✓ (fait manuellement)

---

## 🔧 ÉTAPES DE DÉPLOIEMENT

### Étape 1 : Authentification Supabase

Ouvrez votre terminal et lancez :

```bash
npx supabase login
```

**Ce qui va se passer :**
1. Une fenêtre de navigateur va s'ouvrir
2. Connectez-vous avec votre compte Supabase
3. Autorisez l'accès
4. Revenez au terminal - vous verrez "Logged in"

---

### Étape 2 : Déploiement des fonctions

Une fois connecté, lancez :

```bash
./deploy-stripe-functions.sh oybabixbdfjhbsutquzg
```

**Durée estimée :** 2-3 minutes

**Fonctions qui seront déployées :**
1. ✓ create-subscription-checkout (MODIFIÉ - essai 15j)
2. ✓ stripe-webhook-subscriptions (MODIFIÉ - statut trialing)
3. ✓ create-signature-checkout
4. ✓ create-portal-session
5. ✓ update-subscription-quantity
6. ✓ get-payment-history
7. ✓ stripe-webhook-signatures

---

### Étape 3 : Vérification

Après le déploiement, vérifiez sur Supabase Dashboard :

1. Allez sur : https://supabase.com/dashboard/project/oybabixbdfjhbsutquzg
2. Cliquez sur **Edge Functions** dans la barre latérale
3. Vérifiez que ces fonctions sont **déployées** :
   - `create-subscription-checkout` ← **Important!**
   - `stripe-webhook-subscriptions` ← **Important!**

---

## 🎯 RÉSULTAT ATTENDU

Après le déploiement, **tous les nouveaux clients** auront :

### Phase 1 : Essai gratuit (Jour 1-15)
- ✅ Accès complet immédiat
- ✅ Aucun prélèvement
- ✅ Peut annuler sans frais

### Phase 2 : Après l'essai (Jour 16+)
**Option Mensuelle :**
- Premier paiement le jour 16
- Puis chaque mois à la même date
- Engagement de 12 mois (12 paiements)
- Exemple : Souscrit le 15 jan → Essai jusqu'au 30 jan → Premier paiement le 31 jan → 12 mois d'engagement

**Option Annuelle :**
- Paiement unique le jour 16
- -10% de réduction
- Renouvellement automatique après 1 an

---

## ❌ ERREURS POSSIBLES

### Erreur 403 "No privileges"
**Cause :** Pas authentifié sur Supabase
**Solution :** Lancez `npx supabase login` et reconnectez-vous

### Erreur "Docker is not running"
**Impact :** Aucun - c'est juste un warning, le déploiement fonctionne quand même
**Action :** Ignorez ce message

### Erreur "Function not found"
**Cause :** Mauvais nom de fonction
**Solution :** Vérifiez que les dossiers existent dans `supabase/functions/`

---

## 🧪 TEST APRÈS DÉPLOIEMENT

### Test 1 : Vérifier le message d'essai

1. Allez sur votre page de checkout (ex: `/checkout/essentiel`)
2. Vérifiez que vous voyez :
   - Encadré vert "🎁 15 jours d'essai gratuit"
   - Encadré bleu/violet/orange "Après l'essai : Engagement de 12 mois"

### Test 2 : Créer un abonnement test

1. Créez un compte test
2. Souscrivez à un plan
3. Sur la page Stripe Checkout, vérifiez le message :
   - "🎁 15 jours d'essai gratuit puis engagement de 12 mois"

### Test 3 : Vérifier dans Stripe Dashboard

1. Allez sur Stripe Dashboard
2. **Clients** → Trouvez le client test
3. Cliquez sur l'abonnement
4. Vérifiez :
   - Status : `trialing`
   - Trial end : Dans 15 jours
   - Cancel at : Dans 12 mois (pour mensuel)

---

## 📞 SUPPORT

Si le déploiement échoue :

1. Vérifiez que vous êtes bien connecté : `npx supabase projects list`
2. Vérifiez les logs : `npx supabase functions deploy create-subscription-checkout --project-ref oybabixbdfjhbsutquzg --debug`
3. Redémarrez le terminal et réessayez

---

## ✅ CHECKLIST FINALE

- [ ] Authentification Supabase OK
- [ ] Déploiement des 7 fonctions OK
- [ ] Page checkout affiche l'encadré vert "🎁 15 jours"
- [ ] Stripe : Portail client → Annulation désactivée ✓
- [ ] Test : Création d'un abonnement → Status `trialing`

**Une fois tous les ✓, c'est en production !** 🎉
