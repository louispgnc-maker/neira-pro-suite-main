// Configuration complète Stripe

// Configuration des Price IDs Stripe pour les abonnements
export const STRIPE_PRICE_IDS = {
  essentiel: {
    monthly: 'price_1SlF7K7epLIfQ2kH1CXhd7Qi',
    yearly: 'price_1Sv2qe7epLIfQ2kHzw7rHBQz'
  },
  professionnel: {
    monthly: 'price_1SlF7u7epLIfQ2kH1rkjd80L',
    yearly: 'price_1Sv2rG7epLIfQ2kHNZeDRYWr'
  },
  'cabinet-plus': {
    monthly: 'price_1SlF8H7epLIfQ2kHaupJK7eZ',
    yearly: 'price_1Sv2ra7epLIfQ2kHGqPRDIWP'
  }
} as const;

export type SubscriptionTier = keyof typeof STRIPE_PRICE_IDS;

// Price IDs Stripe pour les packs de signatures (paiements uniques)
export const SIGNATURE_PACK_PRICE_IDS = {
  urgence: 'price_1Sv2ys7epLIfQ2kHk3TJCXC5',      // 1 signature - 3€
  mini: 'price_1Sv2zv7epLIfQ2kHJg3pclkw',         // 10 signatures - 20€
  starter: 'price_1Sv30t7epLIfQ2kHsvb1ass1',      // 25 signatures - 30€
  pro: 'price_1Sv31X7epLIfQ2kHrdT5gUaa',          // 50 signatures - 45€
  business: 'price_1Sv32P7epLIfQ2kHfst7iOEU',     // 100 signatures - 70€
  enterprise: 'price_1Sv32w7epLIfQ2kHPLbZCjDM'    // 250 signatures - 140€
} as const;

// Prix des formules (en euros)
export const SUBSCRIPTION_PRICES = {
  essentiel: {
    monthly: 45,
    yearly: Math.round(45 * 12 * 0.9), // 10% de réduction annuelle
    features: [
      '1 utilisateur',
      '20 Go de stockage',
      '100 dossiers',
      '30 clients',
      '15 signatures/mois',
      'Support email'
    ]
  },
  professionnel: {
    monthly: 69,
    yearly: Math.round(69 * 12 * 0.9),
    features: [
      'Jusqu\'à 10 utilisateurs',
      '100 Go de stockage',
      'Dossiers illimités',
      'Clients illimités',
      '40 signatures/mois par utilisateur',
      'Support prioritaire',
      'Gestion de cabinet'
    ]
  },
  'cabinet-plus': {
    monthly: 99,
    yearly: Math.round(99 * 12 * 0.9),
    features: [
      'Jusqu\'à 50 utilisateurs',
      'Stockage illimité',
      'Dossiers illimités',
      'Clients illimités',
      '100 signatures/mois par utilisateur',
      'Support 24/7',
      'Gestion multi-cabinets',
      'API accès',
      'Rapports avancés'
    ]
  }
} as const;

// Packs de signatures électroniques
export const SIGNATURE_PACKS = [
  {
    id: 'urgence',
    priceId: SIGNATURE_PACK_PRICE_IDS.urgence,
    quantity: 1,
    price: 3,
    pricePerSignature: 3.00,
    description: 'Pack Urgence',
    isEmergency: true
  },
  {
    id: 'mini',
    priceId: SIGNATURE_PACK_PRICE_IDS.mini,
    quantity: 10,
    price: 20,
    pricePerSignature: 2.00,
    description: 'Pack Mini'
  },
  {
    id: 'starter',
    priceId: SIGNATURE_PACK_PRICE_IDS.starter,
    quantity: 25,
    price: 30,
    pricePerSignature: 1.20,
    description: 'Pack Starter'
  },
  {
    id: 'pro',
    priceId: SIGNATURE_PACK_PRICE_IDS.pro,
    quantity: 50,
    price: 45,
    pricePerSignature: 0.90,
    description: 'Pack Pro',
    popular: true
  },
  {
    id: 'business',
    priceId: SIGNATURE_PACK_PRICE_IDS.business,
    quantity: 100,
    price: 70,
    pricePerSignature: 0.70,
    description: 'Pack Business'
  },
  {
    id: 'enterprise',
    priceId: SIGNATURE_PACK_PRICE_IDS.enterprise,
    quantity: 250,
    price: 140,
    pricePerSignature: 0.56,
    description: 'Pack Enterprise'
  }
] as const;

// Méthodes de paiement supportées
export const PAYMENT_METHODS = {
  international: [
    'card',
    'sepa_debit',
    'bancontact',
    'ideal',
    'giropay',
    'sofort'
  ],
  cards: [
    'Visa',
    'Mastercard',
    'American Express'
  ]
} as const;

// URLs de redirection
export const getSuccessUrl = (role: 'avocat' | 'notaire', sessionId?: string) => {
  const prefix = role === 'notaire' ? '/notaires' : '/avocats';
  const sessionParam = sessionId ? `?session_id=${sessionId}` : '';
  return `${window.location.origin}${prefix}/subscription/success${sessionParam}`;
};

export const getCancelUrl = (role: 'avocat' | 'notaire') => {
  const prefix = role === 'notaire' ? '/notaires' : '/avocats';
  return `${window.location.origin}${prefix}/subscription`;
};

// Calculer le prix avec réduction annuelle
export function calculatePrice(
  tier: SubscriptionTier,
  billingPeriod: 'monthly' | 'yearly',
  quantity: number = 1
): number {
  const basePrice = billingPeriod === 'monthly' 
    ? SUBSCRIPTION_PRICES[tier].monthly 
    : SUBSCRIPTION_PRICES[tier].yearly;
  
  return basePrice * quantity;
}

// Formatter le montant en euros
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// Obtenir le label de la période
export function getBillingPeriodLabel(period: 'monthly' | 'yearly'): string {
  return period === 'monthly' ? 'Mensuel' : 'Annuel';
}

// Calculer l'économie annuelle
export function getYearlySavings(tier: SubscriptionTier, quantity: number = 1): number {
  const monthlyTotal = SUBSCRIPTION_PRICES[tier].monthly * 12 * quantity;
  const yearlyTotal = SUBSCRIPTION_PRICES[tier].yearly * quantity;
  return monthlyTotal - yearlyTotal;
}
