-- Migration: Allow any active member to read members list (read-only)
-- Date: 2025-11-06

-- Replace get_cabinet_members to permit owners OR active members to list
drop function if exists public.get_cabinet_members(uuid);
create or replace function public.get_cabinet_members(cabinet_id_param uuid)
returns setof public.cabinet_members
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  -- Authorization: owner OR active member of that cabinet
  if not exists (
    select 1 from cabinets where id = cabinet_id_param and owner_id = auth.uid()
  ) and not exists (
    select 1 from cabinet_members
    where cabinet_id = cabinet_id_param
      and user_id = auth.uid()
      and status = 'active'
  ) then
    raise exception 'Not authorized';
  end if;

  return query
  select cm.*
  from cabinet_members cm
  where cm.cabinet_id = cabinet_id_param
  order by cm.created_at;
end;
$$;
