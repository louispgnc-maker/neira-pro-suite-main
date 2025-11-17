-- Script de rollback pour supprimer complètement la migration cabinets
-- ⚠️ ATTENTION: Cela supprime toutes les données des cabinets!

-- 1) Supprimer TOUTES les policies existantes d'abord
drop policy if exists "cabinet_members_full_access" on public.cabinet_members;
drop policy if exists "cabinet_members_owner_access" on public.cabinet_members;
drop policy if exists "cabinet_members_own_access" on public.cabinet_members;
drop policy if exists "cabinet_members_user_access" on public.cabinet_members;
drop policy if exists "cabinets_owner_access" on public.cabinets;
drop policy if exists "cabinets_members_can_read" on public.cabinets;

-- 2) Supprimer les fonctions
drop function if exists public.invite_cabinet_member(uuid, text, text) cascade;
drop function if exists public.remove_cabinet_member(uuid) cascade;
drop function if exists public.get_cabinet_members(uuid) cascade;
drop function if exists public.get_user_cabinets() cascade;
drop function if exists public.create_cabinet(text, text, text, text, text, text, text, text, text) cascade;
drop function if exists public.join_cabinet_by_code(text) cascade;
drop function if exists public.regenerate_cabinet_code(uuid) cascade;
drop function if exists public.is_cabinet_owner(uuid, uuid) cascade;

-- 3) Supprimer les tables (cascade supprimera ce qui reste)
drop table if exists public.cabinet_members cascade;
drop table if exists public.cabinets cascade;

-- 4) Supprimer la colonne cabinet_id des profiles
alter table public.profiles drop column if exists cabinet_id;

SELECT '✅ Rollback terminé - Tables et fonctions cabinets supprimées' as resultat;
