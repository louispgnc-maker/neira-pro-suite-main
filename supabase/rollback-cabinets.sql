-- Script de rollback pour supprimer complètement la migration cabinets
-- ⚠️ ATTENTION: Cela supprime toutes les données des cabinets!

-- 1) Supprimer les fonctions
drop function if exists public.invite_cabinet_member(uuid, text, text);
drop function if exists public.remove_cabinet_member(uuid);
drop function if exists public.get_cabinet_members(uuid);
drop function if exists public.get_user_cabinets();
drop function if exists public.create_cabinet(text, text, text, text, text, text, text, text, text);
drop function if exists public.join_cabinet_by_code(text);
drop function if exists public.regenerate_cabinet_code(uuid);
drop function if exists public.is_cabinet_owner(uuid, uuid);

-- 2) Supprimer les tables (cascade supprimera les policies et index automatiquement)
drop table if exists public.cabinet_members cascade;
drop table if exists public.cabinets cascade;

-- 3) Supprimer la colonne cabinet_id des profiles
alter table public.profiles drop column if exists cabinet_id;

SELECT '✅ Rollback terminé - Tables et fonctions cabinets supprimées' as resultat;
