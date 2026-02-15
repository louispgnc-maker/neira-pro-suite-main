-- ==========================================
-- SOLUTION SIMPLE: Ajouter contrat_id directement dans client_dossiers_new
-- À copier-coller dans Supabase SQL Editor
-- ==========================================

-- Ajouter une colonne contrat_id dans client_dossiers_new
alter table public.client_dossiers_new 
add column if not exists contrat_id uuid references public.contrats(id) on delete set null;

-- Index pour performance
create index if not exists client_dossiers_new_contrat_idx on public.client_dossiers_new(contrat_id);

-- Migrer les données existantes de client_dossier_contrats vers client_dossiers_new
update public.client_dossiers_new d
set contrat_id = (
  select contrat_id 
  from public.client_dossier_contrats cdc 
  where cdc.dossier_id = d.id 
  limit 1
)
where exists (
  select 1 
  from public.client_dossier_contrats cdc 
  where cdc.dossier_id = d.id
);

-- On peut maintenant supprimer la table client_dossier_contrats (optionnel)
-- drop table if exists public.client_dossier_contrats;
