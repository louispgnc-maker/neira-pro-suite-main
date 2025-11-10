-- Migration: Enforce that only the cabinet creator (owner) has 'Fondateur' permissions
-- Date: 2025-11-06

-- 1) Data cleanup: demote any non-owner members marked as 'Fondateur'/'owner'
update public.cabinet_members cm
set role_cabinet = case c.role when 'notaire' then 'Notaire' else 'Avocat Associé' end
from public.cabinets c
where cm.cabinet_id = c.id
  and (cm.role_cabinet = 'Fondateur' or cm.role_cabinet = 'owner')
  and cm.user_id <> c.owner_id;

-- 2) Ensure at most one founder per cabinet
create unique index if not exists cabinet_founder_unique
  on public.cabinet_members(cabinet_id)
  where role_cabinet = 'Fondateur';

-- 3) Trigger to enforce integrity: only owner can be 'Fondateur' and owner must remain 'Fondateur'
drop function if exists public.enforce_founder_integrity() cascade;
create or replace function public.enforce_founder_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.cabinets where id = NEW.cabinet_id limit 1;
  if v_owner is null then
    raise exception 'Cabinet not found';
  end if;

  -- Only cabinet owner can have 'Fondateur'
  if NEW.role_cabinet = 'Fondateur' and NEW.user_id <> v_owner then
    raise exception 'Only cabinet owner can be Fondateur';
  end if;

  -- Cabinet owner must remain 'Fondateur'
  if NEW.user_id = v_owner and NEW.role_cabinet <> 'Fondateur' then
    raise exception 'Cabinet owner must remain Fondateur';
  end if;

  return NEW;
end;
$$;

drop trigger if exists cabinet_members_enforce_founder on public.cabinet_members;
create trigger cabinet_members_enforce_founder
before insert or update on public.cabinet_members
for each row
execute procedure public.enforce_founder_integrity();

-- 4) Harden the role update RPC to respect the rule
drop function if exists public.update_cabinet_member_role(uuid, text);
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
  v_cab_role text;
  v_member_user uuid;
  v_owner uuid;
begin
  -- Locate member's cabinet, its role and owner
  select cm.cabinet_id, c.role, cm.user_id, c.owner_id
  into v_cabinet_id, v_cab_role, v_member_user, v_owner
  from public.cabinet_members cm
  join public.cabinets c on c.id = cm.cabinet_id
  where cm.id = member_id_param
  limit 1;

  if not found then
    raise exception 'Member not found';
  end if;

  -- Ensure caller is the owner
  if not exists (
    select 1 from public.cabinets
    where id = v_cabinet_id and owner_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  -- Enforce founder rule strictly
  if new_role_param = 'Fondateur' and v_member_user <> v_owner then
    raise exception 'Only cabinet owner can be Fondateur';
  end if;
  if v_member_user = v_owner and new_role_param <> 'Fondateur' then
    raise exception 'Cabinet owner must remain Fondateur';
  end if;

  -- Validate role by cabinet type
  if v_cab_role = 'notaire' then
    if new_role_param not in ('Fondateur', 'Notaire', 'Clerc de Notaire', 'Formaliste', 'Juriste Notarial') then
      raise exception 'Invalid role for notaire cabinet';
    end if;
  elsif v_cab_role = 'avocat' then
    if new_role_param not in ('Fondateur', 'Avocat Associé', 'Avocat Collaborateur', 'Juriste', 'Responsable Administratif') then
      raise exception 'Invalid role for avocat cabinet';
    end if;
  else
    raise exception 'Unknown cabinet role';
  end if;

  -- Apply update
  update public.cabinet_members
  set role_cabinet = new_role_param
  where id = member_id_param;
end;
$$;
