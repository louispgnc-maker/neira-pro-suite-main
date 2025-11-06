-- Migration: Backfill missing founder member rows so owners appear in member listings
-- Date: 2025-11-06
-- Purpose: Ensure every cabinet owner is represented in cabinet_members with role 'Fondateur'.
--          This covers legacy cabinets created before founder insertion logic or where rows were deleted.

-- Insert missing founder membership rows
insert into public.cabinet_members (cabinet_id, user_id, email, nom, role_cabinet, status, joined_at)
select c.id,
       c.owner_id,
       coalesce(u.email, c.email) as email,
       coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), u.email, c.email) as nom,
       'Fondateur',
       'active',
       now()
from public.cabinets c
left join auth.users u on u.id = c.owner_id
left join public.profiles p on p.id = c.owner_id
where not exists (
  select 1 from public.cabinet_members cm
  where cm.cabinet_id = c.id
    and cm.user_id = c.owner_id
);

-- Optional: Normalize any remaining 'owner' role labels to 'Fondateur'
update public.cabinet_members
set role_cabinet = 'Fondateur'
where role_cabinet = 'owner';
