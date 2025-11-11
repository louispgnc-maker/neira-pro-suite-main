-- Supabase RLS policies for calendar_events
-- Date: 2025-11-11

-- Helper: check whether a user is a member of any cabinet that has the given role
-- Assumes tables: cabinet_members (id = profile id, cabinet_id) and cabinets (id, role)
create or replace function public.is_user_in_role(user_id uuid, role_text text)
returns boolean language sql stable as $$
  select exists(
    select 1
    from public.cabinet_members cm
    join public.cabinets c on cm.cabinet_id = c.id
    where cm.user_id = user_id
      and c.role = role_text
      and (cm.status is null or cm.status = 'active')
  );
$$;


-- Enable row level security on calendar_events
alter table if exists public.calendar_events enable row level security;
-- DROP any previous policies for this table so the SQL is idempotent
drop policy if exists "calendar_select_for_members" on public.calendar_events;
drop policy if exists "calendar_insert_owner_only" on public.calendar_events;
drop policy if exists "calendar_update_owner_or_member" on public.calendar_events;
drop policy if exists "calendar_update_owner_or_cabinet_owner" on public.calendar_events;
drop policy if exists "calendar_delete_owner_or_member" on public.calendar_events;
drop policy if exists "calendar_delete_owner_or_cabinet_owner" on public.calendar_events;

-- Allow SELECT for authenticated users who are either the owner or a member of the same role
create policy "calendar_select_for_members"
  on public.calendar_events
  for select
  using (
    auth.uid() is not null
    and (
      owner_id = auth.uid()
      or exists (
        -- allow if current user is a member of the same cabinet as the event owner
        select 1
        from public.profiles owner_p
        join public.cabinet_members cm on cm.cabinet_id = owner_p.cabinet_id
        where owner_p.id = public.calendar_events.owner_id
          and cm.user_id = auth.uid()
          and (cm.status is null or cm.status = 'active')
      )
    )
  );

-- Allow INSERT only when the authenticated user sets themselves as owner
create policy "calendar_insert_owner_only"
  on public.calendar_events
  for insert
  with check (
    auth.uid() is not null
    and owner_id = auth.uid()
  );

-- Allow UPDATE for the owner or any member of the same role
-- Allow UPDATE only for the event owner or the owner of the cabinet that contains the event owner
-- (prevents arbitrary members from updating other members' events)
create policy "calendar_update_owner_or_cabinet_owner"
  on public.calendar_events
  for update
  using (
    auth.uid() is not null
    and (
      owner_id = auth.uid()
      -- OR current user is the owner of the cabinet that the event owner belongs to
      or exists(
        select 1 from public.profiles p
        join public.cabinets c on p.cabinet_id = c.id
        where p.id = public.calendar_events.owner_id
          and c.owner_id = auth.uid()
      )
    )
  )
  with check (
    -- when updating, still require that owner_id remains set
    auth.uid() is not null
    and owner_id is not null
  );

-- Allow DELETE only for the event owner or the owner of the cabinet that contains the event owner
create policy "calendar_delete_owner_or_cabinet_owner"
  on public.calendar_events
  for delete
  using (
    auth.uid() is not null
    and (
      owner_id = auth.uid()
      or exists(
        select 1 from public.profiles p
        join public.cabinets c on p.cabinet_id = c.id
        where p.id = public.calendar_events.owner_id
          and c.owner_id = auth.uid()
      )
    )
  );

-- NOTE:
-- - The INSERT policy requires the client to set owner_id = auth.uid() when creating events.
--   Alternatively, you can create a Postgres function to inject the current user id server-side
--   (but that requires configuring the JWT claims into the request context), so the simplest
--   approach is to set owner_id client-side.
-- - Consider tightening the UPDATE/DELETE policies to only allow owners and cabinet founders
--   (if you have an is_cabinet_owner(user_id, cabinet_id) function you can incorporate it).
-- - After applying these policies, test with multiple accounts to ensure expected behavior.
