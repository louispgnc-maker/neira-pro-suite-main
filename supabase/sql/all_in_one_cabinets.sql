-- All-in-one setup for Cabinets and Memberships (Avocats / Notaires)
-- Run this whole file in Supabase SQL Editor (Upload/Open → Run)
-- This script is idempotent: safe to run multiple times.

-- 0) Extensions and helpers -------------------------------------------------
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1) Core tables ------------------------------------------------------------
create table if not exists public.cabinets (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('avocat', 'notaire')),

  -- Infos générales
  nom text not null,
  raison_sociale text,

  -- Légal
  siret text,
  numero_tva text,
  forme_juridique text,
  capital_social text,

  -- Adresse
  adresse text not null,
  code_postal text,
  ville text,
  pays text default 'France',

  -- Contact
  telephone text,
  email text,
  site_web text,

  -- Métier
  ordre_inscription text,
  numero_inscription text,

  -- Code d'accès unique
  code_acces text unique not null default encode(gen_random_bytes(6), 'hex'),

  -- Vérification email
  email_verified boolean default false,
  verification_token text unique,
  verification_sent_at timestamptz,
  verified_at timestamptz,

  -- Propriétaire/créateur
  owner_id uuid not null references auth.users(id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cabinets_owner_idx on public.cabinets(owner_id);
create index if not exists cabinets_role_idx on public.cabinets(role);
create index if not exists cabinets_code_acces_idx on public.cabinets(code_acces);

create table if not exists public.cabinet_members (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid not null references public.cabinets(id) on delete cascade,
  -- user_id is nullable for pending invites
  user_id uuid references auth.users(id) on delete cascade,

  -- Infos membre
  email text not null,
  nom text,
  role_cabinet text default 'membre',

  -- Statut
  status text not null default 'pending' check (status in ('pending', 'active', 'inactive')),
  invitation_sent_at timestamptz,
  joined_at timestamptz,

  created_at timestamptz not null default now(),

  unique(cabinet_id, user_id)
);

create index if not exists cabinet_members_cabinet_idx on public.cabinet_members(cabinet_id);
create index if not exists cabinet_members_user_idx on public.cabinet_members(user_id);
create index if not exists cabinet_members_status_idx on public.cabinet_members(status);

-- If table existed earlier with NOT NULL, drop it now (idempotent)
alter table public.cabinet_members
  alter column user_id drop not null;

-- Prevent duplicate pending invites per cabinet/email
create unique index if not exists cabinet_members_pending_unique
  on public.cabinet_members(cabinet_id, lower(email))
  where status = 'pending';

-- Profiles backref (optional)
alter table public.profiles add column if not exists cabinet_id uuid references public.cabinets(id) on delete set null;
create index if not exists profiles_cabinet_idx on public.profiles(cabinet_id);

-- 2) RLS & policies ---------------------------------------------------------
alter table public.cabinets enable row level security;
alter table public.cabinet_members enable row level security;

drop policy if exists "cabinets_owner_access" on public.cabinets;
create policy "cabinets_owner_access" on public.cabinets
  for all using (owner_id = auth.uid());

drop policy if exists "cabinet_members_user_access" on public.cabinet_members;
create policy "cabinet_members_user_access" on public.cabinet_members
  for all using (user_id = auth.uid());

-- 3) Triggers ---------------------------------------------------------------
drop trigger if exists cabinets_set_updated_at on public.cabinets;
create trigger cabinets_set_updated_at
before update on public.cabinets
for each row
execute procedure public.set_updated_at();

-- 4) Helper: is_cabinet_owner ----------------------------------------------
create or replace function public.is_cabinet_owner(cabinet_id_param uuid, user_id_param uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from cabinets
    where id = cabinet_id_param and owner_id = user_id_param
  );
$$;

-- 5) RPCs -------------------------------------------------------------------
-- Regenerate access code
drop function if exists public.regenerate_cabinet_code(uuid);
create or replace function public.regenerate_cabinet_code(cabinet_id_param uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  if not exists (
    select 1 from public.cabinets 
    where id = cabinet_id_param and owner_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  new_code := encode(gen_random_bytes(6), 'hex');
  update public.cabinets set code_acces = new_code where id = cabinet_id_param;
  return new_code;
end;
$$;

-- Join by access code
drop function if exists public.join_cabinet_by_code(text);
create or replace function public.join_cabinet_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cabinet_id uuid;
  v_user_id uuid;
  v_user_role text;
  v_cabinet_role text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select role into v_user_role from profiles where id = v_user_id;
  select id, role into v_cabinet_id, v_cabinet_role from cabinets where code_acces = code;
  if not found then raise exception 'Invalid code'; end if;
  if v_user_role != v_cabinet_role then raise exception 'Role mismatch'; end if;

  if exists (
    select 1 from cabinet_members where cabinet_id = v_cabinet_id and user_id = v_user_id
  ) then
    raise exception 'Already a member';
  end if;

  insert into cabinet_members (cabinet_id, user_id, email, nom, role_cabinet, status, joined_at)
  select v_cabinet_id, v_user_id, p.email, 'membre', 'active', now()
  from profiles p where p.id = v_user_id;

  return v_cabinet_id;
end;
$$;

-- Create cabinet: ensure creator becomes 'Fondateur'
drop function if exists public.create_cabinet(text, text, text, text, text, text, text, text, text);
create or replace function public.create_cabinet(
  nom_param text,
  raison_sociale_param text,
  siret_param text,
  adresse_param text,
  code_postal_param text,
  ville_param text,
  telephone_param text,
  email_param text,
  role_param text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_cabinet_id uuid;
  v_code_acces text;
  v_nom_proprietaire text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  v_code_acces := upper(substring(md5(random()::text) from 1 for 8));

  insert into cabinets (
    owner_id, nom, raison_sociale, siret, adresse, code_postal, ville,
    telephone, email, code_acces, role, email_verified
  ) values (
    v_user_id, nom_param, raison_sociale_param, siret_param, adresse_param,
    code_postal_param, ville_param, telephone_param, email_param, v_code_acces,
    role_param, true
  ) returning id into v_cabinet_id;

  select coalesce(nullif(trim(first_name || ' ' || last_name), ''), email)
    into v_nom_proprietaire
  from profiles where id = v_user_id;

  insert into cabinet_members (
    cabinet_id, user_id, email, nom, role_cabinet, status, joined_at
  ) values (
    v_cabinet_id, v_user_id, email_param, v_nom_proprietaire, 'Fondateur', 'active', now()
  );

  return v_cabinet_id;
end;
$$;

-- Get user cabinets (owner or active member)
drop function if exists public.get_user_cabinets();
create or replace function public.get_user_cabinets()
returns setof public.cabinets
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return query
  select c.* from cabinets c
  where c.owner_id = auth.uid()
     or c.id in (
       select cm.cabinet_id
       from cabinet_members cm
       where cm.user_id = auth.uid() and cm.status = 'active'
     );
end;
$$;

-- Members list: owner OR any active member
drop function if exists public.get_cabinet_members(uuid);
create or replace function public.get_cabinet_members(cabinet_id_param uuid)
returns setof public.cabinet_members
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  -- Owner can read everything
  if exists (
    select 1 from cabinets 
    where id = cabinet_id_param and owner_id = auth.uid()
  ) then
    return query
      select cm.* from cabinet_members cm
      where cm.cabinet_id = cabinet_id_param
      order by cm.created_at;
  end if;

  -- Active members can read everything
  if exists (
    select 1 from cabinet_members
    where cabinet_id = cabinet_id_param and user_id = auth.uid() and status = 'active'
  ) then
    return query
      select cm.* from cabinet_members cm
      where cm.cabinet_id = cabinet_id_param
      order by cm.created_at;
  end if;

  -- Pending invited users (no user_id yet) can read ACTIVE members by email match
  -- Extract email from JWT claims when present
  declare
    v_jwt json := nullif(current_setting('request.jwt.claims', true), '')::json;
    v_email text := lower(coalesce(v_jwt ->> 'email', ''));
  begin
    if v_email is not null and v_email <> '' then
      if exists (
        select 1 from cabinet_members cm
        where cm.cabinet_id = cabinet_id_param
          and cm.status = 'pending'
          and lower(cm.email) = v_email
      ) then
        -- Show active members + the invitee's own pending row
        return query
          select cm.* from cabinet_members cm
          where cm.cabinet_id = cabinet_id_param
            and (
              cm.status = 'active'
              or (
                cm.status = 'pending'
                and lower(cm.email) = v_email
              )
            )
          order by cm.created_at;
      end if;
    end if;
  end;

  raise exception 'Not authorized';
end;
$$;

-- Remove member (owner only)
drop function if exists public.remove_cabinet_member(uuid);
create or replace function public.remove_cabinet_member(member_id_param uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cabinet_id uuid;
begin
  select cabinet_id into v_cabinet_id from cabinet_members where id = member_id_param;
  if not found then raise exception 'Member not found'; end if;

  if not exists (
    select 1 from cabinets where id = v_cabinet_id and owner_id = auth.uid()
  ) then raise exception 'Not authorized'; end if;

  delete from cabinet_members where id = member_id_param;
end;
$$;

-- Invite member: lookup in auth.users; allow NULL user_id for pending
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
  if not exists (
    select 1 from cabinets 
    where id = cabinet_id_param and owner_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(email_param)
  limit 1;

  if v_user_id is not null then
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
    insert into cabinet_members (
      cabinet_id, user_id, email, nom, status, invitation_sent_at
    ) values (
      cabinet_id_param, null, email_param, nullif(trim(nom_param), ''), 'pending', now()
    ) returning id into v_member_id;
  end if;

  return v_member_id;
end;
$$;

-- Update member role with validation + founder rule
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
  select cm.cabinet_id, c.role, cm.user_id, c.owner_id
  into v_cabinet_id, v_cab_role, v_member_user, v_owner
  from public.cabinet_members cm
  join public.cabinets c on c.id = cm.cabinet_id
  where cm.id = member_id_param;

  if not found then raise exception 'Member not found'; end if;

  if not exists (
    select 1 from public.cabinets
    where id = v_cabinet_id and owner_id = auth.uid()
  ) then raise exception 'Not authorized'; end if;

  -- Strict founder rule
  if new_role_param = 'Fondateur' and v_member_user <> v_owner then
    raise exception 'Only cabinet owner can be Fondateur';
  end if;
  if v_member_user = v_owner and new_role_param <> 'Fondateur' then
    raise exception 'Cabinet owner must remain Fondateur';
  end if;

  -- Role validation per cabinet type
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

  update public.cabinet_members
  set role_cabinet = new_role_param
  where id = member_id_param;
end;
$$;

-- 6) Data alignments --------------------------------------------------------
-- Normalize any legacy 'owner' labels to 'Fondateur'
update public.cabinet_members
set role_cabinet = 'Fondateur'
where role_cabinet = 'owner';

-- Backfill missing founder membership for owners
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

-- Demote any non-owner founders to a valid non-founder role
update public.cabinet_members cm
set role_cabinet = case c.role when 'notaire' then 'Notaire' else 'Avocat Associé' end
from public.cabinets c
where cm.cabinet_id = c.id
  and (cm.role_cabinet = 'Fondateur' or cm.role_cabinet = 'owner')
  and cm.user_id <> c.owner_id;

-- Single founder per cabinet
create unique index if not exists cabinet_founder_unique
  on public.cabinet_members(cabinet_id)
  where role_cabinet = 'Fondateur';

-- 7) Founder integrity trigger with controlled bypass -----------------------
drop function if exists public.enforce_founder_integrity() cascade;
create or replace function public.enforce_founder_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_bypass text;
begin
  v_bypass := current_setting('app.allow_founder_transfer', true);
  if coalesce(v_bypass, '') = 'on' then
    return NEW;
  end if;

  select owner_id into v_owner from public.cabinets where id = NEW.cabinet_id;
  if v_owner is null then raise exception 'Cabinet not found'; end if;

  if NEW.role_cabinet = 'Fondateur' and NEW.user_id <> v_owner then
    raise exception 'Only cabinet owner can be Fondateur';
  end if;

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

-- 8) Ownership transfer (safe) ----------------------------------------------
drop function if exists public.transfer_cabinet_ownership(uuid, uuid);
create or replace function public.transfer_cabinet_ownership(
  cabinet_id_param uuid,
  new_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_owner uuid;
  v_cab_role text;
begin
  select owner_id, role into v_old_owner, v_cab_role
  from public.cabinets where id = cabinet_id_param;
  if v_old_owner is null then raise exception 'Cabinet not found'; end if;

  if v_old_owner <> auth.uid() then raise exception 'Not authorized'; end if;

  perform set_config('app.allow_founder_transfer', 'on', true);

  update public.cabinets set owner_id = new_owner_id where id = cabinet_id_param;

  update public.cabinet_members cm
  set role_cabinet = case v_cab_role when 'notaire' then 'Notaire' else 'Avocat Associé' end
  where cm.cabinet_id = cabinet_id_param and cm.user_id = v_old_owner;

  insert into public.cabinet_members (cabinet_id, user_id, email, nom, role_cabinet, status, joined_at)
  select cabinet_id_param, u.id, u.email,
         coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), u.email),
         'Fondateur', 'active', now()
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = new_owner_id
  on conflict (cabinet_id, user_id)
  do update set role_cabinet = 'Fondateur', status = 'active';

  perform set_config('app.allow_founder_transfer', 'off', true);
end;
$$;

-- 9) Notes & verification ----------------------------------------------------
-- Optional checks to run after execution:
-- select c.id, c.owner_id, cm.user_id as founder_member
-- from public.cabinets c
-- left join public.cabinet_members cm on cm.cabinet_id = c.id and cm.role_cabinet = 'Fondateur';

-- To transfer ownership safely (run as current owner):
-- select public.transfer_cabinet_ownership('00000000-0000-0000-0000-000000000000'::uuid,
--                                          '11111111-1111-1111-1111-111111111111'::uuid);
