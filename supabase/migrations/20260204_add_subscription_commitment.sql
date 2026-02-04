-- Migration: Ajout des champs d'engagement et période de facturation
-- Pour gérer l'engagement de 12 mois et les règles de downgrade

-- Ajouter les colonnes manquantes à la table cabinets
ALTER TABLE public.cabinets 
ADD COLUMN IF NOT EXISTS billing_period text check (billing_period in ('monthly', 'yearly')),
ADD COLUMN IF NOT EXISTS subscription_commitment_end_date timestamptz,
ADD COLUMN IF NOT EXISTS subscription_commitment_months integer default 12;

-- Commentaires pour documentation
COMMENT ON COLUMN public.cabinets.billing_period IS 'Période de facturation: monthly (mensuel) ou yearly (annuel avec -10%)';
COMMENT ON COLUMN public.cabinets.subscription_commitment_end_date IS 'Date de fin d''engagement contractuel de 12 mois';
COMMENT ON COLUMN public.cabinets.subscription_commitment_months IS 'Durée d''engagement en mois (par défaut 12)';

-- Mettre à jour les cabinets existants avec une date d'engagement par défaut
-- Si un cabinet a déjà un subscription_started_at, on calcule la fin d'engagement
UPDATE public.cabinets
SET 
  billing_period = 'monthly',  -- Par défaut mensuel
  subscription_commitment_end_date = subscription_started_at + interval '12 months',
  subscription_commitment_months = 12
WHERE subscription_started_at IS NOT NULL 
  AND subscription_commitment_end_date IS NULL;

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS cabinets_commitment_end_idx 
ON public.cabinets(subscription_commitment_end_date) 
WHERE subscription_commitment_end_date IS NOT NULL;
