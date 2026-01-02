-- Fonction pour réinitialiser les crédits signatures de tous les membres
-- quand le plan d'abonnement du cabinet change
CREATE OR REPLACE FUNCTION reset_signature_credits_on_plan_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le subscription_plan a changé
  IF OLD.subscription_plan IS DISTINCT FROM NEW.subscription_plan THEN
    -- Réinitialiser les crédits signatures pour tous les membres du cabinet
    UPDATE cabinet_members
    SET 
      signature_addon_quantity = NULL,
      signature_addon_price = NULL,
      signature_addon_purchased_at = NULL,
      signature_addon_expires_at = NULL
    WHERE cabinet_id = NEW.id;
    
    RAISE NOTICE 'Signature credits reset for all members of cabinet % due to plan change from % to %', 
      NEW.id, OLD.subscription_plan, NEW.subscription_plan;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur la table cabinets
DROP TRIGGER IF EXISTS trigger_reset_signature_credits ON cabinets;
CREATE TRIGGER trigger_reset_signature_credits
  AFTER UPDATE OF subscription_plan ON cabinets
  FOR EACH ROW
  EXECUTE FUNCTION reset_signature_credits_on_plan_change();

COMMENT ON FUNCTION reset_signature_credits_on_plan_change() IS 
'Réinitialise automatiquement les crédits signatures de tous les membres quand le plan d''abonnement du cabinet change';
