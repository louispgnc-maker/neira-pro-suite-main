// Configuration des Price IDs Stripe pour les abonnements
export const STRIPE_PRICE_IDS = {
  essentiel: 'price_1SlF7K7epLIfQ2kH1CXhd7Qi',
  professionnel: 'price_1SlF7u7epLIfQ2kH1rkjd80L',
  'cabinet-plus': 'price_1SlF8H7epLIfQ2kHaupJK7eZ',
} as const;

export type SubscriptionTier = keyof typeof STRIPE_PRICE_IDS;
