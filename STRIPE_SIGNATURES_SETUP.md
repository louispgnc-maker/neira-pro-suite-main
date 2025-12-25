# Configuration Stripe pour les signatures

## Vue d'ensemble

Le système de paiement des signatures utilise Stripe Checkout pour gérer les transactions. Les crédits ne sont ajoutés qu'après confirmation du paiement via webhook.

## Architecture

1. **Edge Function: create-signature-checkout**
   - Crée une session Stripe Checkout
   - Localisation: `supabase/functions/create-signature-checkout/`
   
2. **Edge Function: stripe-webhook-signatures**
   - Écoute les événements Stripe
   - Crédite les signatures après paiement confirmé
   - Localisation: `supabase/functions/stripe-webhook-signatures/`

3. **Composant frontend: BuySignaturesDialog**
   - Interface d'achat de signatures
   - Redirige vers Stripe Checkout
   - Localisation: `src/components/cabinet/BuySignaturesDialog.tsx`

## Configuration requise

### 1. Variables d'environnement Supabase

Dans votre projet Supabase, configurez les secrets suivants:

```bash
# Dans votre dashboard Supabase > Project Settings > Edge Functions > Secrets
STRIPE_SECRET_KEY=sk_live_... # ou sk_test_... pour le développement
STRIPE_WEBHOOK_SECRET=whsec_... # Généré après création du webhook
```

### 2. Obtenir les clés Stripe

1. Connectez-vous à https://dashboard.stripe.com/
2. **Clé secrète**: Developers > API keys > Secret key
3. **Webhook secret** (voir section suivante)

### 3. Configurer le webhook Stripe

1. Dans le dashboard Stripe: Developers > Webhooks > Add endpoint
2. URL du webhook: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook-signatures`
3. Événements à écouter:
   - `checkout.session.completed`
4. Copiez le "Signing secret" (whsec_...) et ajoutez-le dans les secrets Supabase

### 4. Déployer les Edge Functions

```bash
# Déployer create-signature-checkout
supabase functions deploy create-signature-checkout --project-ref YOUR_PROJECT_REF

# Déployer stripe-webhook-signatures
supabase functions deploy stripe-webhook-signatures --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

**Important**: Le webhook doit être déployé avec `--no-verify-jwt` car les webhooks Stripe n'incluent pas de JWT d'authentification.

### 5. Tester le paiement

En mode test (avec clés `sk_test_...`):

1. Utilisez une carte de test Stripe: `4242 4242 4242 4242`
2. Date d'expiration: n'importe quelle date future
3. CVC: n'importe quel code à 3 chiffres
4. Le paiement sera confirmé immédiatement
5. Vérifiez que les crédits sont ajoutés dans `cabinet_members`

## Flux de paiement

1. Utilisateur sélectionne un forfait de signatures
2. Frontend appelle `create-signature-checkout` avec les métadonnées:
   - `quantity`: nombre de signatures
   - `price`: prix du forfait
   - `prorataAmount`: montant prorata calculé
   - `cabinetId`, `targetUserId`, `expiresAt`, `role`
3. Stripe génère une session de paiement
4. Utilisateur est redirigé vers Stripe Checkout
5. Après paiement:
   - Succès → Redirection vers `/dashboard?signature_payment=success`
   - Annulation → Redirection vers `/dashboard?signature_payment=cancelled`
6. Stripe envoie un webhook `checkout.session.completed`
7. `stripe-webhook-signatures` crédite les signatures dans `cabinet_members`
8. L'utilisateur voit un toast de confirmation et les données sont rechargées

## Sécurité

- ✅ Le webhook vérifie la signature Stripe (`stripe-signature` header)
- ✅ Les crédits sont ajoutés côté serveur uniquement (pas de manipulation frontend)
- ✅ Utilisation de `SUPABASE_SERVICE_ROLE_KEY` pour bypass RLS dans le webhook
- ✅ Toutes les métadonnées du paiement sont stockées dans la session Stripe

## Dépannage

### Le webhook ne fonctionne pas

1. Vérifiez que `STRIPE_WEBHOOK_SECRET` est correctement configuré
2. Vérifiez les logs Stripe: Dashboard > Developers > Webhooks > [votre endpoint]
3. Vérifiez les logs Supabase: Dashboard > Edge Functions > stripe-webhook-signatures

### Les crédits ne sont pas ajoutés

1. Vérifiez que le webhook a été appelé (logs Stripe)
2. Vérifiez les logs de la fonction `stripe-webhook-signatures`
3. Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est configuré
4. Vérifiez que la table `cabinet_members` a les bonnes colonnes:
   - `signature_addon_quantity`
   - `signature_addon_price`
   - `signature_addon_purchased_at`
   - `signature_addon_expires_at`

### Mode test vs production

- **Test**: Utilisez `sk_test_...` et créez un webhook test
- **Production**: Utilisez `sk_live_...` et créez un webhook production
- Les webhooks test et production doivent pointer vers des URLs différentes si vous avez des environnements séparés

## Tarification actuelle

### Plan Essentiel
- +10 signatures: 7€ (prorata appliqué)
- +25 signatures: 15€ (prorata appliqué)

### Plan Professionnel
- +40 signatures: 15€ (prorata appliqué)
- +100 signatures: 29€ (prorata appliqué)

### Pack de secours (tous plans)
- 10 signatures: 9€ (affiché ≤10 jours avant expiration)

Le **prorata** est calculé automatiquement selon les jours restants dans le cycle de facturation actuel.
