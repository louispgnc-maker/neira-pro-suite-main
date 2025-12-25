-- Fix RPC functions to not filter by status = 'active'
-- This matches the frontend change that removed status filtering

-- Récupérer les documents partagés du cabinet (sans filtre status)
drop function if exists public.get_cabinet_documents(uuid);
create or replace function public.get_cabinet_documents(cabinet_id_param uuid)
returns setof public.cabinet_documents
language sql
security definer
stable
set search_path = public
as $$
  select cd.* from cabinet_documents cd
  where cd.cabinet_id = cabinet_id_param
    and cd.cabinet_id in (
      select cm.cabinet_id from cabinet_members cm
      where cm.user_id = auth.uid()
    )
  order by cd.shared_at desc;
$$;

-- Récupérer les dossiers partagés du cabinet (sans filtre status)
drop function if exists public.get_cabinet_dossiers(uuid);
create or replace function public.get_cabinet_dossiers(cabinet_id_param uuid)
returns setof public.cabinet_dossiers
language sql
security definer
stable
set search_path = public
as $$
  select cd.* from cabinet_dossiers cd
  where cd.cabinet_id = cabinet_id_param
    and cd.cabinet_id in (
      select cm.cabinet_id from cabinet_members cm
      where cm.user_id = auth.uid()
    )
  order by cd.shared_at desc;
$$;

-- Récupérer les contrats partagés du cabinet (sans filtre status)
drop function if exists public.get_cabinet_contrats(uuid);
create or replace function public.get_cabinet_contrats(cabinet_id_param uuid)
returns setof public.cabinet_contrats
language sql
security definer
stable
set search_path = public
as $$
  select cc.* from cabinet_contrats cc
  where cc.cabinet_id = cabinet_id_param
    and cc.cabinet_id in (
      select cm.cabinet_id from cabinet_members cm
      where cm.user_id = auth.uid()
    )
  order by cc.shared_at desc;
$$;
