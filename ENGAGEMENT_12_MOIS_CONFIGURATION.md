# Configuration de l'engagement de 12 mois non annulable

## Résumé
Les abonnements Neira sont des **contrats de 12 mois non résiliables** :
- Paiement en **1 fois** (annuel avec -10%) OU en **12 mensualités**
- **Aucune annulation possible** pendant 12 mois
- Downgrade bloqué, upgrade autorisé avec prorata

## Étapes de configuration

### 1. Configurer le portail client Stripe

**Désactiver les annulations dans le portail client :**

```bash
# Définir la clé API Stripe
export STRIPE_SECRET_KEY="sk_live_..."

# Exécuter le script de configuration
node configure-stripe-portal-no-cancel.mjs
```

**Résultat :**
- ❌ Bouton "Annuler l'abonnement" supprimé du portail client
- ❌ Changement de plan désactivé (géré uniquement par votre app)
- ✅ Mise à jour des informations de paiement activée
- ✅ Consultation de l'historique des factures activée

### 2. Vérifier le webhook d'annulation

Le webhook `stripe-webhook-subscriptions` gère déjà :
- ✅ Enregistrement de `subscription_commitment_end_date` (date + 12 mois)
- ✅ Blocage des downgrades dans l'application

### 3. Gérer les annulations manuelles (si nécessaire)

Si un client contacte le support pour annuler :

**Option A : Refus strict**
- Rappeler les CGV : engagement de 12 mois non négociable
- Proposer uniquement un upgrade ou mise en pause temporaire

**Option B : Annulation avec facturation**
- Annuler l'abonnement dans Stripe
- Créer une facture pour les mois restants
- Script à créer si besoin

### 4. Communication client

**Texte déjà affiché sur les pages checkout :**
```
⚠️ Engagement de 12 mois

Tous les abonnements Neira impliquent un engagement ferme de 12 mois.
Le paiement mensuel est une facilité de paiement, mais l'engagement reste d'un an.

🔒 Downgrade impossible pendant 12 mois
✅ Upgrade autorisé à tout moment
```

**À ajouter dans vos CGV :**
- Clause d'engagement de 12 mois
- Interdiction de résiliation anticipée
- Possibilité d'upgrade uniquement

### 5. Cas particuliers

**Si un client annule via sa banque (chargeback) :**
- Stripe suspendra automatiquement l'accès
- Vous devrez réclamer les mois restants manuellement

**Si vous devez annuler exceptionnellement :**
1. Aller dans Stripe Dashboard
2. Chercher l'abonnement
3. Cliquer "Cancel subscription"
4. Choisir "Cancel immediately" ou "At period end"

## Vérification

**Tester que les annulations sont bloquées :**
1. Créer un abonnement test
2. Ouvrir le portail client : `https://billing.stripe.com/p/session/test_...`
3. Vérifier qu'il n'y a PAS de bouton "Cancel subscription"
4. Vérifier qu'on peut uniquement :
   - Mettre à jour le moyen de paiement
   - Voir l'historique des factures
   - Mettre à jour les infos personnelles

## État actuel

✅ **Déjà implémenté :**
- Engagement de 12 mois dans la base de données
- Blocage des downgrades dans l'application
- Affichage de l'avertissement sur les pages checkout
- Webhook qui enregistre les dates d'engagement

⚠️ **À faire maintenant :**
- Exécuter `configure-stripe-portal-no-cancel.mjs` pour bloquer les annulations dans Stripe
- Vérifier que le portail client ne permet plus d'annuler
- Mettre à jour les CGV si nécessaire

## Notes importantes

- **Les paiements annuels** : le client paie tout d'un coup, donc pas de risque d'annulation
- **Les paiements mensuels** : même si le client paie chaque mois, il s'engage pour 12 mois
- **Le blocage dans Stripe** empêche les annulations via le portail, mais pas via API
- **Vous pouvez toujours annuler manuellement** depuis le Dashboard Stripe si besoin
