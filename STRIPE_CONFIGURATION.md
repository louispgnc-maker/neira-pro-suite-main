# Configuration Stripe - Guide Complet

## ✅ Intégration effectuée

L'intégration Stripe Checkout pour l'abonnement Cabinet+ est maintenant complète avec les fonctionnalités suivantes :

### 1. 🎨 Personnalisation de la page Checkout

**Modifications effectuées dans le code :**
- ✅ Collecte du numéro de téléphone activée
- ✅ Collecte d'adresse de facturation requise
- ✅ Langue française (locale: 'fr')
- ✅ Mise à jour automatique des infos client pour les customers existants

**Configuration dans le Dashboard Stripe :**

Pour personnaliser davantage l'apparence :

1. **Ajouter votre logo et couleurs :**
   - Allez sur https://dashboard.stripe.com/settings/branding
   - Uploadez votre logo Neira
   - Choisissez votre couleur principale (orange #F97316)
   - Choisissez votre couleur d'accent

2. **Personnalisation avancée :**
   - Nom de l'entreprise : "Neira"
   - Icône : votre favicon
   - Couleur de fond personnalisée

### 2. � Paiements Internationaux

**Modifications effectuées dans le code :**
- ✅ Support de multiples méthodes de paiement : carte, SEPA, Bancontact, iDEAL, Giropay, Sofort
- ✅ Pas de taxes automatiques (prix TTC)
- ✅ Collecte d'adresse automatique selon la méthode de paiement

**Méthodes de paiement supportées :**

1. **Carte bancaire** : International (Visa, Mastercard, Amex)
2. **SEPA Debit** : Zone Euro (prélèvement bancaire)
3. **Bancontact** : Belgique
4. **iDEAL** : Pays-Bas
5. **Giropay** : Allemagne
6. **Sofort** : Europe

**Note sur les taxes :**
- Les prix affichés sont TTC (Toutes Taxes Comprises)
- Aucune taxe supplémentaire n'est ajoutée au checkout
- Les prix incluent déjà la TVA française le cas échéant

## 🔧 Configuration des Webhooks

Assurez-vous que les webhooks sont correctement configurés :

### Webhook pour les abonnements
- **URL:** `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook-subscriptions`
- **Événements à écouter:**
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.paid`

### Variables d'environnement Supabase
```bash
STRIPE_SECRET_KEY=sk_test_... # ou sk_live_...
STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS=whsec_...
```

## 🧪 Tester l'intégration

### Cartes de test Stripe

| Scénario | Numéro de carte |
|----------|----------------|
| Paiement réussi | 4242 4242 4242 4242 |
| Authentification requise | 4000 0025 0000 3155 |
| Paiement refusé | 4000 0000 0000 9995 |
| Carte expirée | 4000 0000 0000 0069 |

**Détails pour tester :**
- Date d'expiration : n'importe quelle date future (ex: 12/28)
- CVC : n'importe quel code à 3 chiffres (ex: 123)
- Code postal : n'importe quel code valide (ex: 75001)

### Flux de test complet

1. Allez sur `/checkout-cabinet-plus`
2. Sélectionnez le nombre d'utilisateurs
3. Choisissez la période (mensuel/annuel)
4. Cliquez sur "Procéder au paiement"
5. Vous êtes redirigé vers Stripe Checkout
6. Utilisez une carte de test
7. Complétez le formulaire
8. Vous êtes redirigé vers `/subscription/success`
9. Vérifiez que le webhook a mis à jour la base de données

## 📊 Fonctionnalités actives

- ✅ Paiement par carte bancaire (international)
- ✅ SEPA Debit (Zone Euro)
- ✅ Bancontact (Belgique)
- ✅ iDEAL (Pays-Bas)
- ✅ Giropay (Allemagne)
- ✅ Sofort (Europe)
- ✅ Abonnements récurrents (mensuel/annuel)
- ✅ Gestion de la quantité (nombre de membres)
- ✅ Collecte d'adresse de facturation automatique
- ✅ Collecte de numéro de téléphone
- ✅ Prix TTC sans taxes supplémentaires
- ✅ Webhooks pour synchronisation automatique
- ✅ Page de succès personnalisée
- ✅ Gestion des clients existants et nouveaux
- ✅ Support multilingue (français)
- ✅ Support international (tous pays)

## 🚀 Déploiement en production

### Avant de passer en production :

1. **Remplacer les clés de test par les clés live :**
   ```bash
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS=whsec_...
   ```

2. **Configurer le branding** dans le dashboard Stripe

3. **Activer Stripe Tax** (optionnel mais recommandé)

4. **Tester avec des vraies cartes** en petit montant

5. **Configurer les webhooks en production** avec l'URL finale

6. **Vérifier les Price IDs** correspondent bien à vos plans live

## 📞 Support

En cas de problème :
- Vérifiez les logs Stripe : https://dashboard.stripe.com/logs
- Vérifiez les logs Supabase Edge Functions
- Consultez la documentation : https://docs.stripe.com/payments/checkout

## 🎉 Résumé

Votre intégration Stripe Checkout est maintenant complète avec :
- ✨ Personnalisation du branding (à configurer dans le dashboard)
- � Support de 6 méthodes de paiement (carte, SEPA, Bancontact, iDEAL, Giropay, Sofort)
- 🌍 Paiements internationaux activés
- 💰 Prix TTC sans taxes supplémentaires
- 🔒 Paiements sécurisés
- 🔄 Synchronisation automatique via webhooks
- 📱 Interface responsive et optimisée
