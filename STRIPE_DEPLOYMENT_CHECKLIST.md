# 🚀 DÉPLOIEMENT STRIPE - CHECKLIST

## ✅ Étapes de Déploiement

### 1. Vérifier les Variables d'Environnement

**Sur Supabase Dashboard :**
```bash
# Aller dans Settings → Edge Functions → Secrets
STRIPE_SECRET_KEY=sk_live_... # ⚠️ Utiliser la clé LIVE en production !
```

**Dans le fichier `.env` local :**
```bash
VITE_STRIPE_PUBLIC_KEY=pk_live_... # Clé publique Stripe
```

---

### 2. Configurer les Webhooks Stripe

**URL du Webhook Principal (Abonnements) :**
```
https://[VOTRE-PROJET].supabase.co/functions/v1/stripe-webhook-subscriptions
```

**URL du Webhook Signatures :**
```
https://[VOTRE-PROJET].supabase.co/functions/v1/stripe-webhook-signatures
```

**Événements à Activer :**
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`

**Récupérer le Signing Secret :**
```bash
# Après création du webhook, copier le "Signing secret"
whsec_... 

# L'ajouter dans Supabase Edge Functions Secrets
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

### 3. Créer les Produits et Prix sur Stripe

#### Plan Essentiel
```
Produit : Neira Essentiel
Prix : 39€/mois (recurring)
Price ID : price_essentiel_... 
```

#### Plan Professionnel
```
Produit : Neira Professionnel
Prix : 59€/membre/mois (recurring)
Price ID : price_professionnel_...
```

#### Plan Cabinet+
```
Produit : Neira Cabinet+
Prix : 89€/membre/mois (recurring)
Price ID : price_cabinet_plus_...
```

**⚠️ Important :** Copier les Price IDs et les mettre à jour dans `src/lib/stripeConfig.ts` :
```typescript
export const STRIPE_PRICE_IDS = {
  essentiel: 'price_...',       // ← À REMPLACER
  professionnel: 'price_...',   // ← À REMPLACER
  'cabinet-plus': 'price_...'   // ← À REMPLACER
} as const;
```

---

### 4. Déployer les Edge Functions

**Vérifier que les 7 Edge Functions sont déployées :**
```bash
cd supabase
supabase functions list
```

**Si manquantes, déployer :**
```bash
# Déployer toutes les fonctions Stripe
supabase functions deploy create-subscription-checkout
supabase functions deploy create-signature-checkout
supabase functions deploy update-subscription-quantity
supabase functions deploy create-portal-session
supabase functions deploy get-payment-history
supabase functions deploy stripe-webhook-subscriptions
supabase functions deploy stripe-webhook-signatures
```

**Ou utiliser le script automatique :**
```bash
chmod +x deploy-stripe-functions.sh
./deploy-stripe-functions.sh
```

---

### 5. Tester le Flux de Paiement

#### Test Mode (Stripe Test Keys)
1. Utiliser une carte test : `4242 4242 4242 4242`
2. Date : n'importe quelle date future
3. CVC : n'importe quel 3 chiffres

#### Tests à Effectuer

**Test 1 - Souscription Essentiel :**
```bash
1. Aller sur /checkout/essentiel
2. Cliquer sur "Souscrire"
3. ✅ Vérifier redirection vers Stripe Checkout
4. ✅ Compléter le paiement avec carte test
5. ✅ Vérifier redirection vers /subscription/success
6. ✅ Vérifier dans BDD : subscription_status = 'active'
```

**Test 2 - Modification Nombre de Membres :**
```bash
1. Aller sur /manage-members-count
2. Augmenter de 2 à 5 membres
3. ✅ Vérifier appel à update-subscription-quantity
4. ✅ Vérifier génération facture prorata
5. ✅ Vérifier mise à jour BDD : max_members = 5
```

**Test 3 - Achat de Signatures :**
```bash
1. Ouvrir BuySignaturesDialog
2. Sélectionner un pack
3. ✅ Vérifier redirection Stripe
4. ✅ Compléter le paiement
5. ✅ Vérifier ajout signatures dans BDD
```

**Test 4 - Customer Portal :**
```bash
1. Aller sur /profile
2. Cliquer "Gérer la facturation"
3. ✅ Vérifier redirection vers Stripe Customer Portal
4. ✅ Tester changement de carte bancaire
5. ✅ Télécharger une facture
```

---

### 6. Vérifier les Webhooks en Production

**Tester la Réception des Webhooks :**
```bash
# Dans Stripe Dashboard → Webhooks
1. Cliquer sur votre webhook
2. Aller dans l'onglet "Events"
3. Vérifier que les événements arrivent avec statut 200

# Si erreur 4xx ou 5xx :
- Vérifier STRIPE_WEBHOOK_SECRET dans Supabase
- Vérifier les logs de l'Edge Function
```

**Tester localement avec Stripe CLI :**
```bash
# Installer Stripe CLI
brew install stripe/stripe-cli/stripe

# S'authentifier
stripe login

# Forward les webhooks vers local
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook-subscriptions

# Dans un autre terminal, trigger un événement test
stripe trigger checkout.session.completed
```

---

### 7. Migration des Abonnements Existants (si applicable)

**Si vous avez des abonnements créés avec l'ancien système bypass :**

```sql
-- 1. Lister les cabinets sans stripe_subscription_id
SELECT id, nom, subscription_plan, max_members 
FROM cabinets 
WHERE stripe_subscription_id IS NULL 
  AND subscription_status = 'active';

-- 2. Pour chaque cabinet, créer un abonnement Stripe manuellement via Dashboard
-- 3. Puis mettre à jour la BDD avec les IDs Stripe

UPDATE cabinets 
SET stripe_subscription_id = 'sub_...',
    stripe_subscription_item_id = 'si_...',
    stripe_customer_id = 'cus_...'
WHERE id = '[cabinet_id]';
```

**⚠️ Important :** Ne PAS facturer les utilisateurs deux fois ! Si un abonnement a été créé avec bypass, soit :
- Le migrer gratuitement (trial)
- Ou expliquer la situation et proposer une réduction

---

### 8. Monitoring Post-Déploiement

**Vérifications Quotidiennes (1ère semaine) :**
```bash
# 1. Vérifier les webhooks Stripe Dashboard
- Aucune erreur 4xx/5xx
- Tous les événements traités avec succès

# 2. Vérifier les logs Supabase
- Aller dans Edge Functions → Logs
- Vérifier aucune erreur dans les fonctions Stripe

# 3. Vérifier les paiements
- Stripe Dashboard → Payments
- Tous les paiements succeeded
- Aucun failed sans retry

# 4. Vérifier la synchronisation BDD
SELECT 
  id, nom, subscription_status, stripe_subscription_id, max_members
FROM cabinets 
WHERE subscription_status = 'active';

# Tous les cabinets actifs doivent avoir un stripe_subscription_id
```

---

## 🚨 Troubleshooting

### Erreur : "Stripe checkout session creation failed"
```bash
Cause : Mauvaise configuration des Price IDs
Solution : Vérifier STRIPE_PRICE_IDS dans stripeConfig.ts
```

### Erreur : "Webhook signature verification failed"
```bash
Cause : STRIPE_WEBHOOK_SECRET incorrect
Solution : 
1. Aller sur Stripe Dashboard → Webhooks
2. Copier le Signing Secret
3. Le mettre à jour dans Supabase Edge Functions Secrets
4. Redéployer la fonction webhook
```

### Erreur : "Subscription item ID not found"
```bash
Cause : Cabinet créé avant l'intégration Stripe
Solution : Migrer manuellement (voir étape 7)
```

### Les webhooks ne sont pas reçus
```bash
Cause : URL de webhook incorrecte ou fonction non déployée
Solution :
1. Vérifier l'URL : https://[projet].supabase.co/functions/v1/stripe-webhook-subscriptions
2. Tester avec : curl https://[projet].supabase.co/functions/v1/stripe-webhook-subscriptions
3. Si erreur 404, redéployer la fonction
```

---

## 📊 Métriques de Succès

Après déploiement, vous devriez voir :

✅ **Taux de conversion checkout > 80%**
- Si < 50%, vérifier UX du checkout

✅ **Webhooks success rate > 99%**
- Si < 95%, investiguer les erreurs

✅ **0 abonnements sans stripe_subscription_id**
- Si > 0, migrer les cabinets

✅ **Payment success rate > 95%**
- Si < 90%, vérifier les méthodes de paiement acceptées

---

## 📞 Support

**En cas de problème critique :**
1. Vérifier les logs Supabase Edge Functions
2. Vérifier les événements Stripe Dashboard
3. Consulter la documentation : https://stripe.com/docs
4. Support Stripe : https://support.stripe.com

**Fichiers de documentation :**
- `STRIPE_INTEGRATION_COMPLETE.md` - Vue d'ensemble
- `STRIPE_BYPASS_FIXES.md` - Détails des corrections
- `GUIDE_STRIPE_BUSINESS.md` - Guide technique complet
- `STRIPE_QUICK_START.md` - Guide rapide de démarrage

---

## ✅ Checklist Finale

Avant de passer en production :

- [ ] Variables d'environnement configurées (LIVE keys)
- [ ] Webhooks configurés avec signing secret
- [ ] Price IDs mis à jour dans stripeConfig.ts
- [ ] 7 Edge Functions déployées et fonctionnelles
- [ ] Tests de paiement effectués (mode test)
- [ ] Migration des abonnements existants (si applicable)
- [ ] Monitoring configuré
- [ ] Documentation à jour
- [ ] Équipe formée sur le nouveau système

**Vous êtes prêt ! 🚀**
