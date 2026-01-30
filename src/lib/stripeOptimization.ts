/**
 * Configuration et optimisations globales pour les paiements Stripe
 */

// Configuration du timeout pour les requêtes Stripe
export const STRIPE_REQUEST_TIMEOUT = 10000; // 10 secondes

// Configuration du cache
export const CACHE_CONFIG = {
  CABINET_DATA: 5 * 60 * 1000, // 5 minutes
  STRIPE_SESSION: 2 * 60 * 1000, // 2 minutes
  USER_PROFILE: 10 * 60 * 1000, // 10 minutes
};

// Messages optimisés pour les toast notifications
export const TOAST_MESSAGES = {
  STRIPE: {
    PREPARING: 'Préparation du paiement...',
    CONNECTING: 'Connexion à Stripe...',
    REDIRECTING: 'Redirection vers le paiement...',
    SUCCESS: 'Redirection...',
    ERROR: 'Erreur de paiement',
    PORTAL_OPENING: 'Ouverture du portail Stripe...',
  },
  VALIDATION: {
    NOT_AUTHENTICATED: 'Vous devez être connecté',
    NO_CABINET: 'Cabinet non trouvé',
    INVALID_PLAN: 'Configuration du plan invalide',
    SELECT_PACKAGE: 'Veuillez sélectionner un forfait',
  },
};

/**
 * Fonction helper pour gérer les erreurs Stripe de manière cohérente
 */
export function handleStripeError(error: unknown): string {
  if (error instanceof Error) {
    // Messages d'erreur spécifiques Stripe
    if (error.message.includes('card')) {
      return 'Problème avec votre carte bancaire';
    }
    if (error.message.includes('network')) {
      return 'Problème de connexion réseau';
    }
    if (error.message.includes('timeout')) {
      return 'La requête a expiré, veuillez réessayer';
    }
    return error.message;
  }
  return 'Une erreur inattendue s\'est produite';
}

/**
 * Debounce function pour éviter les appels répétés
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Fonction pour précharger les ressources Stripe
 */
export function preloadStripeResources() {
  // Précharger le domaine Stripe pour réduire la latence DNS
  if (typeof document !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = 'https://checkout.stripe.com';
    document.head.appendChild(link);
    
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = 'https://checkout.stripe.com';
    document.head.appendChild(preconnect);
  }
}
