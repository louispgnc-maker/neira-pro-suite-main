-- Fonction pour mettre à jour la quantity Stripe automatiquement
CREATE OR REPLACE FUNCTION update_stripe_quantity()
RETURNS TRIGGER AS $$
DECLARE
  cabinet_rec RECORD;
  active_members_count INTEGER;
  supabase_url TEXT;
  service_role_key TEXT;
  function_url TEXT;
  http_response RECORD;
BEGIN
  -- Récupérer l'URL et la clé de service depuis les variables d'environnement
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Déterminer le cabinet_id affecté
  DECLARE
    affected_cabinet_id UUID;
  BEGIN
    IF TG_OP = 'DELETE' THEN
      affected_cabinet_id := OLD.cabinet_id;
    ELSE
      affected_cabinet_id := NEW.cabinet_id;
    END IF;
    
    -- Récupérer les infos du cabinet
    SELECT 
      id, 
      stripe_subscription_item_id, 
      subscription_status
    INTO cabinet_rec
    FROM cabinets
    WHERE id = affected_cabinet_id;
    
    -- Vérifier que le cabinet a un abonnement Stripe actif
    IF cabinet_rec.stripe_subscription_item_id IS NULL THEN
      RAISE NOTICE 'No Stripe subscription for cabinet %', affected_cabinet_id;
      RETURN NEW;
    END IF;
    
    IF cabinet_rec.subscription_status != 'active' THEN
      RAISE NOTICE 'Subscription not active for cabinet %', affected_cabinet_id;
      RETURN NEW;
    END IF;
    
    -- Compter les membres actifs
    SELECT COUNT(*)
    INTO active_members_count
    FROM cabinet_members
    WHERE cabinet_id = affected_cabinet_id
      AND status IN ('active', 'inactive');
    
    -- S'assurer qu'il y a au moins 1 membre (pour éviter quantity=0)
    active_members_count := GREATEST(active_members_count, 1);
    
    RAISE NOTICE 'Updating Stripe quantity for cabinet % to %', affected_cabinet_id, active_members_count;
    
    -- Mettre à jour dans la table locale d'abord
    UPDATE cabinets
    SET quantity_members = active_members_count
    WHERE id = affected_cabinet_id;
    
    -- Appeler l'Edge Function pour mettre à jour Stripe
    -- Note: Ceci utilise pg_net extension si disponible, sinon utiliser l'approche webhook
    BEGIN
      -- Si pg_net est disponible
      SELECT * FROM net.http_post(
        url := COALESCE(supabase_url, 'https://elysrdqujzlbvnjfilvh.supabase.co') || '/functions/v1/update-subscription-quantity',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
        ),
        body := jsonb_build_object(
          'subscriptionItemId', cabinet_rec.stripe_subscription_item_id,
          'quantity', active_members_count
        )
      ) INTO http_response;
      
      RAISE NOTICE 'Stripe API called: status %', http_response.status;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not call Stripe API: %. Quantity updated in DB only.', SQLERRM;
    END;
    
  END;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger sur INSERT, UPDATE et DELETE
DROP TRIGGER IF EXISTS trigger_update_stripe_quantity ON cabinet_members;
CREATE TRIGGER trigger_update_stripe_quantity
  AFTER INSERT OR UPDATE OF status OR DELETE
  ON cabinet_members
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_quantity();

COMMENT ON FUNCTION update_stripe_quantity IS 'Met à jour automatiquement la quantity Stripe quand un membre est ajouté/supprimé/modifié';
