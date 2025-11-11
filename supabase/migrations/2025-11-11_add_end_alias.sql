-- Add a compatibility alias column "end" that mirrors end_at
-- This fixes clients or realtime publications expecting a column named `end`.

alter table if exists public.calendar_events add column if not exists "end" timestamptz;

-- Backfill existing rows
update public.calendar_events set "end" = end_at where "end" is distinct from end_at or "end" is null;

-- Keep the "end" column in sync with end_at on insert/update
create or replace function public.sync_end_from_end_at()
returns trigger as $$
begin
  new."end" := new.end_at;
  return new;
end;
$$ language plpgsql;

drop trigger if exists sync_end_trigger on public.calendar_events;
create trigger sync_end_trigger
  before insert or update on public.calendar_events
  for each row execute function public.sync_end_from_end_at();
