-- Backfill calendar_events.role from owner's cabinet role if missing
-- Date: 2025-11-11

begin;

update public.calendar_events ce
set role = sub.role
from (
  select p.id as owner_id, c.role
  from public.profiles p
  join public.cabinets c on p.cabinet_id = c.id
) as sub
where ce.role is null and ce.owner_id = sub.owner_id;

commit;
