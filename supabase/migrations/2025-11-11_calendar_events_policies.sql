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
    where cm.id = user_id
      and c.role = role_text
      and (cm.status is null or cm.status = 'active')
  );
$$;

-- Enable row level security on calendar_events
alter table if exists public.calendar_events enable row level security;

-- Allow SELECT for authenticated users who are either the owner or a member of the same role
create policy "calendar_select_for_members"
  on public.calendar_events
  for select
  using (
    auth.uid() is not null
    and (
      owner_id = auth.uid()
      or public.is_user_in_role(auth.uid(), role)
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
create policy "calendar_update_owner_or_member"
  on public.calendar_events
  for update
  using (
    auth.uid() is not null
    and (
      owner_id = auth.uid()
      or public.is_user_in_role(auth.uid(), role)
    )
  )
  with check (
    -- when updating, still require that owner_id remains set (and if changed it must equal the actor)
    auth.uid() is not null
    and owner_id = auth.uid()
  );

-- Allow DELETE for the owner or any member of the same role
create policy "calendar_delete_owner_or_member"
  on public.calendar_events
  for delete
  using (
    auth.uid() is not null
    and (
      owner_id = auth.uid()
      or public.is_user_in_role(auth.uid(), role)
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
