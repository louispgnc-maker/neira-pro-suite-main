-- Script de nettoyage complet du compte denis@neira.test
-- ⚠️ ATTENTION : Supprime TOUTES les données liées à ce compte

-- 1. Supprimer les messages de contact
DELETE FROM public.contact_messages 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'denis@neira.test');

-- 2. Supprimer les demandes de signature
DELETE FROM public.signature_requests 
WHERE owner_id IN (SELECT id FROM auth.users WHERE email = 'denis@neira.test');

-- 3. Supprimer les contrats
DELETE FROM public.contrats 
WHERE owner_id IN (SELECT id FROM auth.users WHERE email = 'denis@neira.test');

-- 4. Supprimer les dossiers
DELETE FROM public.dossiers 
WHERE owner_id IN (SELECT id FROM auth.users WHERE email = 'denis@neira.test');

-- 5. Supprimer les clients
DELETE FROM public.clients 
WHERE owner_id IN (SELECT id FROM auth.users WHERE email = 'denis@neira.test');

-- 6. Supprimer les événements du calendrier
DELETE FROM public.calendar_events 
WHERE owner_id IN (SELECT id FROM auth.users WHERE email = 'denis@neira.test');

-- 7. Supprimer les membres du cabinet (invitations)
DELETE FROM public.cabinet_members 
WHERE cabinet_id IN (
  SELECT id FROM public.cabinets 
  WHERE owner_id IN (SELECT id FROM auth.users WHERE email = 'denis@neira.test')
);

-- 8. Supprimer les clients partagés du cabinet
DELETE FROM public.cabinet_clients 
WHERE cabinet_id IN (
  SELECT id FROM public.cabinets 
  WHERE owner_id IN (SELECT id FROM auth.users WHERE email = 'denis@neira.test')
);

-- 9. Supprimer les dossiers partagés du cabinet
DELETE FROM public.cabinet_dossiers 
WHERE cabinet_id IN (
  SELECT id FROM public.cabinets 
  WHERE owner_id IN (SELECT id FROM auth.users WHERE email = 'denis@neira.test')
);

-- 10. Supprimer les contrats partagés du cabinet
DELETE FROM public.cabinet_contrats 
WHERE cabinet_id IN (
  SELECT id FROM public.cabinets 
  WHERE owner_id IN (SELECT id FROM auth.users WHERE email = 'denis@neira.test')
);

-- 11. Supprimer le cabinet
DELETE FROM public.cabinets 
WHERE owner_id IN (SELECT id FROM auth.users WHERE email = 'denis@neira.test');

-- 12. Supprimer le profil
DELETE FROM public.profiles 
WHERE id IN (SELECT id FROM auth.users WHERE email = 'denis@neira.test');

-- 13. Supprimer l'utilisateur auth (nécessite admin API)
-- À faire via Dashboard Supabase > Authentication > Users > Delete

-- Résumé
SELECT 
  'Nettoyage terminé' as status,
  'Compte denis@neira.test prêt à être supprimé depuis le Dashboard' as message;
