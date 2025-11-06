-- Migration: Enforce allowed member roles per cabinet type
-- Date: 2025-11-06

-- Replace function with validation by cabinet role
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
begin
  -- Locate member's cabinet and its role (avocat/notaire)
  select cm.cabinet_id, c.role
  into v_cabinet_id, v_cab_role
  from cabinet_members cm
  join cabinets c on c.id = cm.cabinet_id
  where cm.id = member_id_param;

  if not found then
    raise exception 'Member not found';
  end if;

  -- Ensure caller is the owner
  if not exists (
    select 1 from cabinets
    where id = v_cabinet_id and owner_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  -- Validate role by cabinet type
  if v_cab_role = 'notaire' then
    if new_role_param not in ('Notaire', 'Clerc de Notaire', 'Formaliste', 'Juriste Notarial') then
      raise exception 'Invalid role for notaire cabinet';
    end if;
  elsif v_cab_role = 'avocat' then
    if new_role_param not in ('Avocat Associé', 'Avocat Collaborateur', 'Juriste', 'Responsable Administratif') then
      raise exception 'Invalid role for avocat cabinet';
    end if;
  else
    raise exception 'Unknown cabinet role';
  end if;

  -- Apply update
  update cabinet_members
  set role_cabinet = new_role_param
  where id = member_id_param;
end;
$$;
