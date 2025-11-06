-- Migration: Fix invites flow (allow pending without user_id, search in auth.users)
-- Date: 2025-11-06

-- 1) Allow pending invites without a known user_id
alter table public.cabinet_members
  alter column user_id drop not null;

-- Optional: prevent duplicate pending invites to same email per cabinet
create unique index if not exists cabinet_members_pending_unique
  on public.cabinet_members(cabinet_id, lower(email))
  where status = 'pending';

-- 2) Update invite_cabinet_member to lookup in auth.users and insert NULL user_id when unknown
drop function if exists public.invite_cabinet_member(uuid, text, text);
create or replace function public.invite_cabinet_member(
  cabinet_id_param uuid,
  email_param text,
  nom_param text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_member_id uuid;
begin
  -- Ensure caller is the owner
  if not exists (
    select 1 from cabinets 
    where id = cabinet_id_param and owner_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  -- Lookup user by email in auth.users (authoritative)
  select id into v_user_id
  from auth.users
  where lower(email) = lower(email_param)
  limit 1;

  if v_user_id is not null then
    -- Already a member?
    if exists (
      select 1 from cabinet_members
      where cabinet_id = cabinet_id_param and user_id = v_user_id
    ) then
      raise exception 'Already a member';
    end if;

    insert into cabinet_members (
      cabinet_id, user_id, email, nom, status, joined_at
    ) values (
      cabinet_id_param, v_user_id, email_param, nullif(trim(nom_param), ''), 'active', now()
    ) returning id into v_member_id;
  else
    -- Pending invite with NULL user_id; unique guard prevents duplicates per email
    insert into cabinet_members (
      cabinet_id, user_id, email, nom, status, invitation_sent_at
    ) values (
      cabinet_id_param, null, email_param, nullif(trim(nom_param), ''), 'pending', now()
    ) returning id into v_member_id;
  end if;

  return v_member_id;
end;
$$;
