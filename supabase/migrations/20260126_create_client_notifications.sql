-- Create client_notifications table
CREATE TABLE IF NOT EXISTS client_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('dossier_created', 'dossier_updated', 'document_added', 'profile_updated', 'new_message', 'contrat_shared')),
  reference_id UUID, -- ID du dossier, document, message concerné
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_client_notifications_client_id ON client_notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_created_at ON client_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_notifications_is_read ON client_notifications(is_read);

-- RLS Policies
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Clients can view their own notifications" ON client_notifications;
DROP POLICY IF EXISTS "Clients can update their own notifications" ON client_notifications;
DROP POLICY IF EXISTS "Professionals can create notifications" ON client_notifications;

-- Clients can view their own notifications
CREATE POLICY "Clients can view their own notifications"
  ON client_notifications
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Clients can mark their notifications as read
CREATE POLICY "Clients can update their own notifications"
  ON client_notifications
  FOR UPDATE
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Professionals can create notifications for their clients
CREATE POLICY "Professionals can create notifications"
  ON client_notifications
  FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT c.id FROM clients c
      INNER JOIN cabinets cab ON c.owner_id = cab.id
      INNER JOIN cabinet_members cm ON cab.id = cm.cabinet_id
      WHERE cm.user_id = auth.uid()
    )
  );

-- Function to create notification
CREATE OR REPLACE FUNCTION create_client_notification(
  p_client_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO client_notifications (client_id, title, message, type, reference_id, created_by)
  VALUES (p_client_id, p_title, p_message, p_type, p_reference_id, auth.uid())
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Trigger function for new dossier
CREATE OR REPLACE FUNCTION notify_on_dossier_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM create_client_notification(
    NEW.client_id,
    'Nouveau dossier créé',
    'Un nouveau dossier "' || NEW.titre || '" a été créé pour vous.',
    'dossier_created',
    NEW.id
  );
  RETURN NEW;
END;
$$;

-- Trigger function for dossier update
CREATE OR REPLACE FUNCTION notify_on_dossier_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only notify if status changed
  IF OLD.status IS DISTINCT FROM NEW.status OR OLD.titre IS DISTINCT FROM NEW.titre THEN
    PERFORM create_client_notification(
      NEW.client_id,
      'Dossier mis à jour',
      'Le dossier "' || NEW.titre || '" a été modifié.',
      'dossier_updated',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function for new document
CREATE OR REPLACE FUNCTION notify_on_document_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM create_client_notification(
    NEW.client_id,
    'Nouveau document ajouté',
    'Un nouveau document "' || COALESCE(NEW.title, NEW.file_name) || '" a été partagé avec vous.',
    'document_added',
    NEW.id
  );
  RETURN NEW;
END;
$$;

-- Trigger function for new contrat
CREATE OR REPLACE FUNCTION notify_on_contrat_shared()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only notify when a contrat is assigned to a client
  IF NEW.client_id IS NOT NULL THEN
    PERFORM create_client_notification(
      NEW.client_id,
      'Nouveau contrat partagé',
      'Un nouveau contrat "' || NEW.titre || '" a été partagé avec vous.',
      'contrat_shared',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function for profile update
CREATE OR REPLACE FUNCTION notify_on_profile_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only notify if important fields changed
  IF OLD.name IS DISTINCT FROM NEW.name 
     OR OLD.email IS DISTINCT FROM NEW.email 
     OR OLD.phone IS DISTINCT FROM NEW.phone 
     OR OLD.address IS DISTINCT FROM NEW.address THEN
    PERFORM create_client_notification(
      NEW.id,
      'Profil mis à jour',
      'Vos informations de profil ont été modifiées.',
      'profile_updated',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_dossier_created ON client_dossiers_new;
CREATE TRIGGER trigger_notify_dossier_created
  AFTER INSERT ON client_dossiers_new
  FOR EACH ROW
  WHEN (auth.uid() IS NOT NULL)
  EXECUTE FUNCTION notify_on_dossier_created();

DROP TRIGGER IF EXISTS trigger_notify_dossier_updated ON client_dossiers_new;
CREATE TRIGGER trigger_notify_dossier_updated
  AFTER UPDATE ON client_dossiers_new
  FOR EACH ROW
  WHEN (auth.uid() IS NOT NULL)
  EXECUTE FUNCTION notify_on_dossier_updated();

DROP TRIGGER IF EXISTS trigger_notify_document_added ON client_shared_documents;
CREATE TRIGGER trigger_notify_document_added
  AFTER INSERT ON client_shared_documents
  FOR EACH ROW
  WHEN (auth.uid() IS NOT NULL)
  EXECUTE FUNCTION notify_on_document_added();

DROP TRIGGER IF EXISTS trigger_notify_contrat_shared ON contrats;
CREATE TRIGGER trigger_notify_contrat_shared
  AFTER INSERT ON contrats
  FOR EACH ROW
  WHEN (auth.uid() IS NOT NULL AND NEW.client_id IS NOT NULL)
  EXECUTE FUNCTION notify_on_contrat_shared();

DROP TRIGGER IF EXISTS trigger_notify_contrat_updated ON contrats;
CREATE TRIGGER trigger_notify_contrat_updated
  AFTER UPDATE ON contrats
  FOR EACH ROW
  WHEN (auth.uid() IS NOT NULL AND NEW.client_id IS NOT NULL AND OLD.client_id IS NULL)
  EXECUTE FUNCTION notify_on_contrat_shared();

DROP TRIGGER IF EXISTS trigger_notify_profile_updated ON clients;
CREATE TRIGGER trigger_notify_profile_updated
  AFTER UPDATE ON clients
  FOR EACH ROW
  WHEN (auth.uid() IS NOT NULL)
  EXECUTE FUNCTION notify_on_profile_updated();

