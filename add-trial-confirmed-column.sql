-- Ajouter une colonne pour savoir si l'utilisateur a confirmé son abonnement après l'essai
ALTER TABLE cabinets
ADD COLUMN IF NOT EXISTS trial_confirmed BOOLEAN DEFAULT FALSE;

-- Mettre à jour les abonnements existants qui ne sont plus en essai
UPDATE cabinets
SET trial_confirmed = TRUE
WHERE subscription_status NOT IN ('trial', 'trialing');

COMMENT ON COLUMN cabinets.trial_confirmed IS 'TRUE si l''utilisateur a confirmé son abonnement après la période d''essai de 7 jours';
