-- ⚠️ COPIER-COLLER CE SQL DANS LE SQL EDITOR DE SUPABASE
-- Dashboard > SQL Editor > New query > Exécuter

-- Ajouter les colonnes d'engagement à la table cabinets
ALTER TABLE public.cabinets 
ADD COLUMN IF NOT EXISTS billing_period text check (billing_period in ('monthly', 'yearly')),
ADD COLUMN IF NOT EXISTS subscription_commitment_end_date timestamptz,
ADD COLUMN IF NOT EXISTS subscription_commitment_months integer default 12;

-- Mettre à jour les cabinets existants
UPDATE public.cabinets
SET 
  billing_period = 'monthly',
  subscription_commitment_end_date = subscription_started_at + interval '12 months',
  subscription_commitment_months = 12
WHERE subscription_started_at IS NOT NULL 
  AND subscription_commitment_end_date IS NULL;

-- Index pour performance
CREATE INDEX IF NOT EXISTS cabinets_commitment_end_idx 
ON public.cabinets(subscription_commitment_end_date) 
WHERE subscription_commitment_end_date IS NOT NULL;
