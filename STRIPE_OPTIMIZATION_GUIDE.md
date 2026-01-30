# 🎯 Guide Rapide - Optimisations Stripe

## Pour les développeurs

### Nouvelles fonctionnalités disponibles

#### 1. Hook de cache pour les données du cabinet

```typescript
import { useCabinetData, invalidateCabinetCache } from '@/hooks/useCabinetData';

// Utilisation dans un composant
function MyComponent() {
  const { user } = useAuth();
  const { cabinetData, loading, error } = useCabinetData(user?.id, 'notaire');

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;

  return <div>Cabinet ID: {cabinetData?.cabinet_id}</div>;
}

// Invalider le cache après une mise à jour
function updateCabinet() {
  // ... mise à jour du cabinet
  invalidateCabinetCache(user?.id); // Invalider le cache
}
```

#### 2. Helpers d'optimisation Stripe

```typescript
import { 
  handleStripeError, 
  TOAST_MESSAGES, 
  debounce 
} from '@/lib/stripeOptimization';

// Gestion cohérente des erreurs
try {
  // ... appel Stripe
} catch (error) {
  const message = handleStripeError(error);
  toast.error(message);
}

// Messages standardisés
toast.info(TOAST_MESSAGES.STRIPE.PREPARING);
toast.info(TOAST_MESSAGES.STRIPE.CONNECTING);

// Debouncing
const debouncedSearch = debounce((value: string) => {
  // Fonction de recherche
}, 300);
```

#### 3. Pattern recommandé pour les paiements

```typescript
const handlePayment = async () => {
  // 1. Validation immédiate
  if (!user) {
    toast.error(TOAST_MESSAGES.VALIDATION.NOT_AUTHENTICATED);
    return;
  }

  // 2. Définir l'état de chargement
  setLoading(true);
  toast.info(TOAST_MESSAGES.STRIPE.PREPARING);

  try {
    // 3. Requêtes parallèles si possible
    const [result1, result2] = await Promise.all([
      query1(),
      query2()
    ]);

    // 4. Feedback progressif
    toast.info(TOAST_MESSAGES.STRIPE.CONNECTING);
    const checkoutUrl = await createStripeCheckoutSession({...});

    // 5. Redirection avec feedback
    toast.success(TOAST_MESSAGES.STRIPE.REDIRECTING);
    window.location.href = checkoutUrl;

  } catch (error) {
    // 6. Gestion d'erreur cohérente
    toast.error(handleStripeError(error));
    setLoading(false);
  }
};
```

## Checklist pour ajouter un nouveau bouton Stripe

- [ ] Ajouter un état `loading` avec `useState`
- [ ] Valider les données AVANT `setLoading(true)`
- [ ] Ajouter `disabled={loading}` sur le bouton
- [ ] Utiliser les messages toast progressifs
- [ ] Implémenter la gestion d'erreurs avec `handleStripeError`
- [ ] Utiliser `Promise.all()` pour les requêtes indépendantes
- [ ] Protéger contre les double-clics

## Exemple complet

```typescript
import { useState } from 'react';
import { toast } from 'sonner';
import { createStripeCheckoutSession } from '@/lib/stripeCheckout';
import { TOAST_MESSAGES, handleStripeError } from '@/lib/stripeOptimization';
import { useCabinetData } from '@/hooks/useCabinetData';

function CheckoutButton() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const { cabinetData } = useCabinetData(user?.id, 'notaire');

  const handleCheckout = async () => {
    // Validation
    if (!user) {
      toast.error(TOAST_MESSAGES.VALIDATION.NOT_AUTHENTICATED);
      return;
    }

    if (!cabinetData) {
      toast.error(TOAST_MESSAGES.VALIDATION.NO_CABINET);
      return;
    }

    setLoading(true);
    toast.info(TOAST_MESSAGES.STRIPE.PREPARING);

    try {
      toast.info(TOAST_MESSAGES.STRIPE.CONNECTING);
      const url = await createStripeCheckoutSession({
        priceId: 'price_xxx',
        cabinetId: cabinetData.cabinet_id,
        quantity: 1,
        successUrl: `${window.location.origin}/success`,
        cancelUrl: `${window.location.origin}/cancel`
      });

      toast.success(TOAST_MESSAGES.STRIPE.REDIRECTING);
      window.location.href = url;
    } catch (error) {
      toast.error(TOAST_MESSAGES.STRIPE.ERROR, {
        description: handleStripeError(error)
      });
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleCheckout} 
      disabled={loading}
    >
      {loading ? 'Chargement...' : 'Payer'}
    </Button>
  );
}
```

## Bonnes pratiques

### ✅ À FAIRE
- Valider avant de charger
- Utiliser le feedback progressif
- Protéger contre les double-clics
- Utiliser le cache pour les données fréquentes
- Gérer les erreurs de manière cohérente
- Logger les performances en développement

### ❌ À ÉVITER
- Ne pas valider les données
- Pas de feedback utilisateur
- Permettre les double-clics
- Requêtes séquentielles inutiles
- Messages d'erreur génériques
- Logging verbeux en production

## Debug

Les logs de performance sont automatiquement activés :
```
⏱️ Edge function call completed in 234ms
✅ Checkout URL ready in 234ms
```

Pour désactiver en production, ajoutez dans `stripeCheckout.ts` :
```typescript
if (import.meta.env.DEV) {
  console.log('...');
}
```

## Support

En cas de problème :
1. Vérifier les logs de la console
2. Vérifier les erreurs dans `get_errors`
3. Tester avec le cache désactivé
4. Consulter [STRIPE_OPTIMIZATIONS.md](./STRIPE_OPTIMIZATIONS.md)
