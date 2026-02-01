# 🚀 Passage en Mode Production - Neira

## ✅ Checklist Complète

### 1. 🏦 Activer le compte Stripe

#### a) Compléter les informations légales
1. Aller sur [Stripe Dashboard](https://dashboard.stripe.com)
2. Cliquer sur **"Activate payments"** en haut
3. Remplir le formulaire avec :
   - **Type d'entreprise** : Entreprise individuelle / SAS / SARL
   - **Informations légales** : SIREN, adresse du siège
   - **Représentant légal** : Nom, prénom, date de naissance
   - **Coordonnées bancaires** : IBAN pour recevoir les paiements
   - **Pièce d'identité** : CNI ou passeport à uploader

#### b) Activer l'API en production
Une fois le compte validé (24-48h), l'onglet "Production" sera accessible

### 2. 🔑 Récupérer les Clés API LIVE

1. Aller dans **Developers** → **API keys**
2. Basculer en mode **LIVE** (toggle en haut à droite)
3. Copier :
   - **Publishable key** : `pk_live_...`
   - **Secret key** : `sk_live_...` (cliquer sur "Reveal")
   - **Webhook signing secret** : On le créera après

### 3. 💳 Créer les Produits et Prix en LIVE

#### Option A : Via Dashboard Stripe
1. Mode **LIVE** activé
2. **Products** → **Add product**
3. Créer chaque formule :

**NEIRA Essentiel**
- Prix mensuel : 45€
- Prix annuel : 486€ (45€ × 12 × 0.9)
- Billing : Récurrent

**NEIRA Professionnel** 
- Prix mensuel : 69€ par utilisateur
- Prix annuel : 745€ par utilisateur
- Billing : Récurrent, avec quantity

**NEIRA Cabinet+**
- Prix mensuel : 99€ par utilisateur  
- Prix annuel : 1069€ par utilisateur
- Billing : Récurrent, avec quantity

**Packs Signatures**
- 1 signature : 3€ (one-time)
- 10 signatures : 20€ (one-time)
- 25 signatures : 30€ (one-time)
- 50 signatures : 45€ (one-time)
- 100 signatures : 70€ (one-time)
- 250 signatures : 140€ (one-time)

#### Option B : Script automatique (plus rapide)
Créer un script pour générer tous les prix :

```bash
npm run create-stripe-products-live
```

### 4. 🔧 Configurer Supabase avec les clés LIVE

#### a) Variables d'environnement Edge Functions
1. **Supabase Dashboard** → **Project Settings** → **Edge Functions**
2. **Manage environment variables**
3. Ajouter/Modifier :
   ```
   STRIPE_SECRET_KEY = sk_live_VOTRE_CLE_LIVE
   STRIPE_PUBLISHABLE_KEY = pk_live_VOTRE_CLE_LIVE
   ```

#### b) Mettre à jour les price IDs
1. Copier les nouveaux price IDs depuis Stripe
2. Remplacer dans `src/lib/stripeConfig.ts`

### 5. 🪝 Configurer les Webhooks Stripe LIVE

#### a) Créer le webhook
1. **Stripe Dashboard** → **Developers** → **Webhooks** (mode LIVE)
2. **Add endpoint**
3. URL : `https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/stripe-webhook-subscriptions`
4. **Events to listen to** :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

#### b) Signatures (webhook 2)
1. **Add endpoint**
2. URL : `https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/stripe-webhook-signatures`
3. **Events** :
   - `checkout.session.completed`
   - `payment_intent.succeeded`

#### c) Récupérer les signing secrets
1. Copier le **Signing secret** de chaque webhook
2. **Supabase** → **Edge Functions** → **Environment variables**
3. Ajouter :
   ```
   STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS = whsec_...
   STRIPE_WEBHOOK_SECRET_SIGNATURES = whsec_...
   ```

### 6. 🧪 Tester en Production

#### a) Test avec carte réelle
1. Utiliser une vraie carte bancaire
2. Montant minimum : 1€
3. Vérifier :
   - ✅ Paiement reçu sur Stripe
   - ✅ Webhook déclenché
   - ✅ Données enregistrées dans Supabase
   - ✅ Email de confirmation envoyé

#### b) Tester les erreurs
- Carte refusée
- 3D Secure
- Paiement échoué

### 7. 📧 Emails de Production

#### a) Resend
1. Vérifier le domaine `neira.fr` dans Resend
2. Configurer SPF/DKIM pour éviter spam
3. Tester l'envoi d'emails

#### b) Templates
- Confirmation de paiement
- Échec de paiement
- Renouvellement d'abonnement
- Factures

### 8. 🔒 Sécurité

#### a) Vérifier les RLS Policies
```sql
-- Vérifier que seuls les owners peuvent voir les abonnements
SELECT * FROM cabinets WHERE stripe_customer_id IS NOT NULL;
```

#### b) Logs et monitoring
- Activer Stripe Radar pour la détection de fraude
- Configurer les alertes Supabase
- Monitorer les webhooks

### 9. 🚀 Déploiement Final

#### a) Mettre à jour le code
```bash
# Mettre à jour les price IDs
git add src/lib/stripeConfig.ts
git commit -m "Prod: Price IDs Stripe en mode LIVE"
git push

# Redéployer toutes les Edge Functions
npx supabase functions deploy create-subscription-checkout --no-verify-jwt
npx supabase functions deploy create-signature-checkout --no-verify-jwt
npx supabase functions deploy stripe-webhook-subscriptions
npx supabase functions deploy stripe-webhook-signatures
```

#### b) Variables d'environnement frontend
Si tu utilises des variables côté client (non recommandé pour les clés), vérifie `.env.production`

### 10. ✅ Validation Finale

- [ ] Compte Stripe activé et vérifié
- [ ] Clés API LIVE récupérées
- [ ] Produits et prix créés en LIVE
- [ ] Variables Supabase mises à jour
- [ ] Webhooks configurés et testés
- [ ] Price IDs mis à jour dans le code
- [ ] Test paiement réel réussi
- [ ] Emails de confirmation fonctionnent
- [ ] RLS activées et testées
- [ ] Code déployé en production

---

## ⚠️ IMPORTANT

### Avant de lancer en production :
1. **Backup de la base de données**
2. **Test complet du tunnel de paiement**
3. **Vérifier les CGV et mentions légales**
4. **Conformité RGPD**
5. **Assurance responsabilité civile professionnelle**

### Coûts Stripe :
- **1.4% + 0.25€** par transaction européenne
- **2.9% + 0.25€** par transaction carte internationale
- Pas de frais d'abonnement

### Support :
- Documentation : https://stripe.com/docs
- Support Stripe : https://support.stripe.com
- Dashboard : https://dashboard.stripe.com

---

## 🆘 En cas de problème

### Webhook ne fonctionne pas
```bash
# Tester manuellement
stripe listen --forward-to https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/stripe-webhook-subscriptions

# Envoyer un événement test
stripe trigger checkout.session.completed
```

### Paiement refusé
- Vérifier les logs Stripe
- Vérifier le 3D Secure
- Contacter le support Stripe

### Données non enregistrées
- Vérifier les logs Edge Functions (Supabase Dashboard)
- Vérifier que le webhook secret est correct
- Vérifier les RLS policies
