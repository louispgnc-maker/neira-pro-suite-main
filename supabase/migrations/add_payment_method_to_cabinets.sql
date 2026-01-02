-- Ajouter les colonnes pour stocker les informations de paiement
ALTER TABLE cabinets
ADD COLUMN IF NOT EXISTS payment_method_last4 VARCHAR(4),
ADD COLUMN IF NOT EXISTS payment_method_brand VARCHAR(50),
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN cabinets.payment_method_last4 IS 'Les 4 derniers chiffres de la carte bancaire';
COMMENT ON COLUMN cabinets.payment_method_brand IS 'Marque de la carte (Visa, Mastercard, etc.)';
COMMENT ON COLUMN cabinets.stripe_customer_id IS 'ID client Stripe pour gérer les paiements';
COMMENT ON COLUMN cabinets.stripe_subscription_id IS 'ID abonnement Stripe';
