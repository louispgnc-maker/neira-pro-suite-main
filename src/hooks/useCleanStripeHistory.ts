import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Hook pour nettoyer l'historique après un retour depuis Stripe
 * Empêche de retomber sur la page de paiement Stripe avec le bouton retour
 */
export function useCleanStripeHistory() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Vérifier si on vient de Stripe (via le referer)
    const cameFromStripe = document.referrer.includes('stripe.com') || 
                          document.referrer.includes('checkout.stripe.com');
    
    // Ou si un paramètre indique qu'on vient d'annuler un paiement
    const params = new URLSearchParams(location.search);
    const fromStripe = params.get('from') === 'stripe';

    if (cameFromStripe || fromStripe) {
      // Remplacer l'entrée actuelle dans l'historique pour éviter de retourner sur Stripe
      window.history.replaceState(null, '', location.pathname + location.search);
      
      // Nettoyer l'URL si elle contient le paramètre from=stripe
      if (fromStripe) {
        params.delete('from');
        const newSearch = params.toString();
        const newUrl = location.pathname + (newSearch ? '?' + newSearch : '');
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [location]);
}
