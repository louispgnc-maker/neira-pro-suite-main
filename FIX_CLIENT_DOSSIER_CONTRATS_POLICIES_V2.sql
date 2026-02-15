-- ==========================================
-- Fix v2: Policies RLS plus permissives pour client_dossier_contrats
-- À copier-coller dans Supabase SQL Editor
-- ==========================================

-- Supprimer les anciennes policies
drop policy if exists "client_dossier_contrats_select" on public.client_dossier_contrats;
drop policy if exists "client_dossier_contrats_insert" on public.client_dossier_contrats;
drop policy if exists "client_dossier_contrats_delete" on public.client_dossier_contrats;

-- Policy SELECT: permettre la lecture si le dossier existe (simplifié)
create policy "client_dossier_contrats_select" on public.client_dossier_contrats
  for select using (
    exists (
      select 1 from public.client_dossiers_new d
      where d.id = dossier_id
    )
  );

-- Policy INSERT: permettre l'insertion si le dossier existe (simplifié)
create policy "client_dossier_contrats_insert" on public.client_dossier_contrats
  for insert with check (
    exists (
      select 1 from public.client_dossiers_new d
      where d.id = dossier_id
    )
  );

-- Policy DELETE: permettre la suppression si le dossier existe (simplifié)
create policy "client_dossier_contrats_delete" on public.client_dossier_contrats
  for delete using (
    exists (
      select 1 from public.client_dossiers_new d
      where d.id = dossier_id
    )
  );
