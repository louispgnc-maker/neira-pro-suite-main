-- Migration pour réinitialiser les signatures mensuelles à chaque cycle de facturation

-- Ajouter une colonne pour tracker le dernier reset des signatures
ALTER TABLE cabinet_members 
ADD COLUMN IF NOT EXISTS signatures_last_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Fonction pour réinitialiser les signatures mensuelles
CREATE OR REPLACE FUNCTION reset_monthly_signatures()
RETURNS void AS $$
BEGIN
  -- Pour chaque cabinet actif
  UPDATE cabinet_members cm
  SET signatures_last_reset_at = NOW()
  FROM cabinets c
  WHERE cm.cabinet_id = c.id
    AND c.subscription_started_at IS NOT NULL
    -- Vérifier si on a dépassé la date anniversaire mensuelle
    AND (
      -- Si c'est le jour anniversaire
      EXTRACT(DAY FROM NOW()) = EXTRACT(DAY FROM c.subscription_started_at)
      -- OU si on n'a pas reset ce mois-ci
      OR (cm.signatures_last_reset_at IS NULL OR 
          EXTRACT(MONTH FROM cm.signatures_last_reset_at) != EXTRACT(MONTH FROM NOW()) OR
          EXTRACT(YEAR FROM cm.signatures_last_reset_at) != EXTRACT(YEAR FROM NOW()))
    );

  RAISE NOTICE 'Signatures mensuelles réinitialisées pour les cabinets éligibles';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer une fonction qui peut être appelée via webhook
CREATE OR REPLACE FUNCTION handle_billing_cycle_reset(cabinet_id_param UUID)
RETURNS void AS $$
BEGIN
  -- Réinitialiser le compteur pour tous les membres de ce cabinet
  UPDATE cabinet_members
  SET signatures_last_reset_at = NOW()
  WHERE cabinet_id = cabinet_id_param;

  RAISE NOTICE 'Signatures reset pour cabinet %', cabinet_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reset_monthly_signatures() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_billing_cycle_reset(UUID) TO authenticated;

COMMENT ON FUNCTION reset_monthly_signatures() IS 
'Réinitialise les quotas de signatures mensuelles pour tous les cabinets à leur date anniversaire';

COMMENT ON FUNCTION handle_billing_cycle_reset(UUID) IS 
'Réinitialise les quotas de signatures pour un cabinet spécifique lors d''un événement de facturation Stripe';
