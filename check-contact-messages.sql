-- Script SQL pour vérifier les messages de contact reçus
-- À exécuter dans Supabase > SQL Editor

-- Voir tous les messages de contact (les plus récents en premier)
SELECT 
  id,
  first_name || ' ' || last_name as nom_complet,
  email,
  company,
  subject,
  LEFT(message, 100) as apercu_message,
  status,
  created_at
FROM contact_messages 
ORDER BY created_at DESC
LIMIT 20;

-- Compter les messages non lus
SELECT COUNT(*) as messages_non_lus
FROM contact_messages 
WHERE status = 'new';

-- Messages des dernières 24h
SELECT 
  first_name || ' ' || last_name as nom,
  email,
  subject,
  created_at
FROM contact_messages 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
