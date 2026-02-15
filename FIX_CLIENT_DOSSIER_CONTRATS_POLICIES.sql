-- ==========================================
-- Fix: Corriger les policies RLS de client_dossier_contrats
-- À copier-coller dans Supabase SQL Editor
-- ==========================================

-- Supprimer les anciennes policies
drop policy if exists "client_dossier_contrats_select" on public.client_dossier_contrats;
drop policy if exists "client_dossier_contrats_insert" on public.client_dossier_contrats;
drop policy if exists "client_dossier_contrats_delete" on public.client_dossier_contrats;

-- Policy SELECT: permettre la lecture si l'utilisateur a accès au dossier
create policy "client_dossier_contrats_select" on public.client_dossier_contrats
  for select using (
    exists (
      select 1 from public.client_dossiers_new d
      inner join public.cabinet_members cm on cm.cabinet_id = d.cabinet_id
      where d.id = dossier_id
        and cm.user_id = auth.uid()
    )
  );

-- Policy INSERT: permettre l'insertion si l'utilisateur a accès au dossier
create policy "client_dossier_contrats_insert" on public.client_dossier_contrats
  for insert with check (
    exists (
      select 1 from public.client_dossiers_new d
      inner join public.cabinet_members cm on cm.cabinet_id = d.cabinet_id
      where d.id = dossier_id
        and cm.user_id = auth.uid()
    )
  );

-- Policy DELETE: permettre la suppression si l'utilisateur a accès au dossier
create policy "client_dossier_contrats_delete" on public.client_dossier_contrats
  for delete using (
    exists (
      select 1 from public.client_dossiers_new d
      inner join public.cabinet_members cm on cm.cabinet_id = d.cabinet_id
      where d.id = dossier_id
        and cm.user_id = auth.uid()
    )
  );
