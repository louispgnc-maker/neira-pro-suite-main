-- Migration: Add RPC function to update cabinet member role
-- Date: 2025-11-06

create or replace function public.update_cabinet_member_role(
  member_id_param uuid,
  new_role_param text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cabinet_id uuid;
begin
  -- Récupérer le cabinet du membre
  select cabinet_id into v_cabinet_id
  from cabinet_members
  where id = member_id_param;

  if not found then
    raise exception 'Member not found';
  end if;

  -- Vérifier que l'appelant est owner du cabinet
  if not exists (
    select 1 from cabinets
    where id = v_cabinet_id and owner_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  -- Mettre à jour le rôle (la validation métier pourra être renforcée plus tard)
  update cabinet_members
  set role_cabinet = new_role_param
  where id = member_id_param;
end;
$$;
