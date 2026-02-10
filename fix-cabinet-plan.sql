-- Script pour corriger le subscription_plan du cabinet
-- Ce script récupère l'abonnement Stripe et met à jour le tier correct

DO $$
DECLARE
  v_cabinet_id uuid := '85e7f59a-ac19-476d-8484-6e4988b9638d';
BEGIN
  -- Afficher les informations actuelles
  RAISE NOTICE 'Updating cabinet: %', v_cabinet_id;
  
  -- Pour le moment, on va le mettre à jour manuellement
  -- Basé sur le fait que vous avez payé pour "professionnel"
  UPDATE cabinets
  SET 
    subscription_plan = 'professionnel',
    max_members = 2,
    updated_at = NOW()
  WHERE id = v_cabinet_id;
  
  RAISE NOTICE 'Cabinet updated to professionnel plan with 2 members';
END $$;

-- Vérifier la mise à jour
SELECT 
  id,
  nom,
  subscription_plan,
  max_members,
  stripe_subscription_id
FROM cabinets
WHERE id = '85e7f59a-ac19-476d-8484-6e4988b9638d';
