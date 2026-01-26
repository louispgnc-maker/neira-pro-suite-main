-- Active Realtime pour la table client_notifications
-- À exécuter dans le SQL Editor de Supabase

-- Active la publication Realtime pour client_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE client_notifications;

-- Vérifie que c'est activé
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'client_notifications';
