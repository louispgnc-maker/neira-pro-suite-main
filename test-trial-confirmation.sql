-- Simuler un essai expiré pour tester la page de confirmation
-- Exécute ceci pour voir la page, puis annule après le test

UPDATE cabinets
SET 
  subscription_status = 'trialing',
  trial_confirmed = FALSE,
  subscription_started_at = NOW() - INTERVAL '8 days'  -- Il y a 8 jours
WHERE id = '85e7f59a-ac19-476d-8484-6e4988b9638d';

-- Pour revenir à la normale après le test :
-- UPDATE cabinets
-- SET 
--   trial_confirmed = TRUE,
--   subscription_started_at = NOW()
-- WHERE id = '85e7f59a-ac19-476d-8484-6e4988b9638d';
