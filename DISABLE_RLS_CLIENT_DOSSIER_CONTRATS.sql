-- ==========================================
-- Test: Désactiver temporairement RLS sur client_dossier_contrats
-- À copier-coller dans Supabase SQL Editor
-- ==========================================

-- Désactiver RLS temporairement
alter table public.client_dossier_contrats disable row level security;

-- Pour réactiver plus tard (NE PAS EXÉCUTER MAINTENANT) :
-- alter table public.client_dossier_contrats enable row level security;
