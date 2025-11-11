-- Migration: create calendar_events table for shared calendar
-- Date: 2025-11-11

create table if not exists public.calendar_events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  start timestamptz not null,
  end timestamptz,
  all_day boolean default false,
  owner_id uuid references profiles(id) on delete set null,
  role text,
  color text,
  event_type text,
  visibility jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- index to speed queries by cabinet role and start date
create index if not exists idx_calendar_events_role_start on public.calendar_events (role, start desc);

-- Trigger to update updated_at on row update
create or replace function public.trigger_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_on_calendar_events on public.calendar_events;
create trigger set_updated_at_on_calendar_events
  before update on public.calendar_events
  for each row execute function public.trigger_set_updated_at();
