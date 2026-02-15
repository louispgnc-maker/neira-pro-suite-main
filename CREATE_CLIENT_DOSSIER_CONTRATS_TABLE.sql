-- ==========================================
-- Migration: Créer la table client_dossier_contrats
-- À copier-coller dans Supabase SQL Editor
-- ==========================================

-- Table de liaison entre client_dossiers_new et contrats
create table if not exists public.client_dossier_contrats (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.client_dossiers_new(id) on delete cascade,
  contrat_id uuid not null references public.contrats(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(dossier_id, contrat_id)
);

-- Enable RLS
alter table public.client_dossier_contrats enable row level security;

-- Policies: accès via les permissions du dossier parent
drop policy if exists "client_dossier_contrats_select" on public.client_dossier_contrats;
create policy "client_dossier_contrats_select" on public.client_dossier_contrats
  for select using (
    exists (
      select 1 from public.client_dossiers_new d
      where d.id = dossier_id
    )
  );

drop policy if exists "client_dossier_contrats_insert" on public.client_dossier_contrats;
create policy "client_dossier_contrats_insert" on public.client_dossier_contrats
  for insert with check (
    exists (
      select 1 from public.client_dossiers_new d
      where d.id = dossier_id
    )
  );

drop policy if exists "client_dossier_contrats_delete" on public.client_dossier_contrats;
create policy "client_dossier_contrats_delete" on public.client_dossier_contrats
  for delete using (
    exists (
      select 1 from public.client_dossiers_new d
      where d.id = dossier_id
    )
  );

-- Indexes pour performance
create index if not exists client_dossier_contrats_dossier_idx on public.client_dossier_contrats(dossier_id);
create index if not exists client_dossier_contrats_contrat_idx on public.client_dossier_contrats(contrat_id);

-- Commentaire
comment on table public.client_dossier_contrats is 'Table de liaison entre les dossiers clients et les contrats';
