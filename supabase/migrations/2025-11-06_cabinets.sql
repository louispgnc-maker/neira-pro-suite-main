-- Migration: Cabinets (offices) for Avocats and Notaires
-- Les cabinets d'avocats et de notaires sont séparés (via colonne 'role')
-- Chaque cabinet a un créateur/owner qui peut inviter des membres

-- 1) Table CABINETS (sans les policies RLS pour l'instant)
create table if not exists public.cabinets (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('avocat', 'notaire')), -- Séparation avocat/notaire
  
  -- Informations générales
  nom text not null,
  raison_sociale text,
  
  -- Informations légales
  siret text,
  numero_tva text,
  forme_juridique text, -- SELARL, SCP, SARL, etc.
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
  
  -- Informations métier
  ordre_inscription text, -- Barreau ou Chambre des Notaires
  numero_inscription text,
  
  -- Code d'accès unique pour rejoindre le cabinet
  code_acces text unique not null default encode(gen_random_bytes(6), 'hex'),
  
  -- Statut de validation
  email_verified boolean default false,
  verification_token text unique,
  verification_sent_at timestamptz,
  verified_at timestamptz,
  
  -- Propriétaire/créateur du cabinet
  owner_id uuid not null references auth.users(id) on delete cascade,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cabinets_owner_idx on public.cabinets(owner_id);
create index if not exists cabinets_role_idx on public.cabinets(role);
create index if not exists cabinets_code_acces_idx on public.cabinets(code_acces);

-- 2) Table CABINET_MEMBERS (membres du cabinet)
create table if not exists public.cabinet_members (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid not null references public.cabinets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Informations du membre
  email text not null,
  nom text,
  role_cabinet text default 'membre', -- 'owner' | 'admin' | 'membre'
  
  -- Statut de l'invitation
  status text not null default 'pending' check (status in ('pending', 'active', 'inactive')),
  invitation_sent_at timestamptz,
  joined_at timestamptz,
  
  created_at timestamptz not null default now(),
  
  -- Un utilisateur ne peut être membre qu'une seule fois par cabinet
  unique(cabinet_id, user_id)
);

create index if not exists cabinet_members_cabinet_idx on public.cabinet_members(cabinet_id);
create index if not exists cabinet_members_user_idx on public.cabinet_members(user_id);
create index if not exists cabinet_members_status_idx on public.cabinet_members(status);

-- 2b) Fonction helper pour vérifier si un user est owner d'un cabinet (SECURITY DEFINER pour bypass RLS)
create or replace function public.is_cabinet_owner(cabinet_id_param uuid, user_id_param uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  -- Bypass RLS complètement en utilisant SECURITY DEFINER
  select exists (
    select 1 from cabinets
    where id = cabinet_id_param and owner_id = user_id_param
  );
$$;

-- 3) Activer RLS et créer les policies (après que les deux tables existent)
alter table public.cabinets enable row level security;
alter table public.cabinet_members enable row level security;

-- Policies pour CABINETS - ULTRA SIMPLE
-- Seul le propriétaire peut accéder à son cabinet
drop policy if exists "cabinets_owner_access" on public.cabinets;
create policy "cabinets_owner_access" on public.cabinets
  for all using (owner_id = auth.uid());

-- Policies pour CABINET_MEMBERS - ULTRA SIMPLE (SANS RÉFÉRENCE À CABINETS)
-- Chaque user peut voir et gérer TOUS ses memberships
drop policy if exists "cabinet_members_user_access" on public.cabinet_members;
create policy "cabinet_members_user_access" on public.cabinet_members
  for all using (
    exists (
      select 1 from public.cabinets c
      where c.id = cabinet_id and c.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.cabinet_members cm
      where cm.cabinet_id = cabinet_id and cm.user_id = auth.uid() and cm.status = 'active'
    )
    or user_id = auth.uid()
    or (
      coalesce(lower((nullif(current_setting('request.jwt.claims', true), '')::json ->> 'email')), '') = lower(coalesce(email, ''))
      and status = 'pending'
    )
  );

-- NOTE: Les owners gèrent les membres via les fonctions RPC SECURITY DEFINER
-- qui bypass complètement les policies (regenerate_cabinet_code, join_cabinet_by_code, etc.)

-- 4) Trigger pour updated_at sur cabinets
drop trigger if exists cabinets_set_updated_at on public.cabinets;
create trigger cabinets_set_updated_at
before update on public.cabinets
for each row
execute procedure public.set_updated_at();

-- 5) Function pour générer un nouveau code d'accès
drop function if exists public.regenerate_cabinet_code(uuid);
create or replace function public.regenerate_cabinet_code(cabinet_id_param uuid)
returns text
language plpgsql
security definer
as $$
declare
  new_code text;
begin
  -- Vérifier que l'utilisateur est le owner du cabinet
  if not exists (
    select 1 from public.cabinets 
    where id = cabinet_id_param and owner_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;
  
  -- Générer un nouveau code
  new_code := encode(gen_random_bytes(6), 'hex');
  
  -- Mettre à jour le cabinet
  update public.cabinets
  set code_acces = new_code
  where id = cabinet_id_param;
  
  return new_code;
end;
$$;

-- 6) Function pour rejoindre un cabinet par code
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

  -- Récupérer le rôle de l'utilisateur
  select role into v_user_role from profiles where id = v_user_id limit 1;

  -- Trouver le cabinet par code
  select id, role into v_cabinet_id, v_cabinet_role
  from cabinets
  where code_acces = code
  limit 1;

  if not found then
    raise exception 'Invalid code';
  end if;

  -- Vérifier que le rôle correspond
  if v_user_role != v_cabinet_role then
    raise exception 'Role mismatch';
  end if;

  -- Vérifier si déjà membre
  if exists (
    select 1 from cabinet_members
    where cabinet_id = v_cabinet_id and user_id = v_user_id
  ) then
    raise exception 'Already a member';
  end if;

  -- Récupérer l'email depuis le profil
  insert into cabinet_members (cabinet_id, user_id, email, role_cabinet, status, joined_at)
  select v_cabinet_id, v_user_id, p.email, 'membre', 'active', now()
  from profiles p
  where p.id = v_user_id;

  return v_cabinet_id;
end;
$$;

-- 7) Function pour créer un cabinet (bypass RLS)
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
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Générer un code d'accès unique
  v_code_acces := upper(substring(md5(random()::text) from 1 for 8));

  -- Créer le cabinet
  insert into cabinets (
    owner_id, nom, raison_sociale, siret, adresse, code_postal, ville,
    telephone, email, code_acces, role, email_verified
  ) values (
    v_user_id, nom_param, raison_sociale_param, siret_param, adresse_param,
    code_postal_param, ville_param, telephone_param, email_param, v_code_acces,
    role_param, true
  ) returning id into v_cabinet_id;

  -- Ajouter l'owner comme membre
  insert into cabinet_members (
    cabinet_id, user_id, email, nom, role_cabinet, status, joined_at
  ) values (
    v_cabinet_id, v_user_id, email_param, nom_param, 'owner', 'active', now()
  );

  return v_cabinet_id;
end;
$$;

-- 8) Function pour récupérer les cabinets d'un utilisateur (bypass RLS)

-- 7) Function pour récupérer les cabinets d'un utilisateur (bypass RLS)
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
  select c.*
  from cabinets c
  where c.owner_id = auth.uid()
     or c.id in (
       select cm.cabinet_id
       from cabinet_members cm
       where cm.user_id = auth.uid()
         and cm.status = 'active'
     );
end;
$$;

-- 8) Function pour récupérer les membres d'un cabinet (bypass RLS)
drop function if exists public.get_cabinet_members(uuid);
create or replace function public.get_cabinet_members(cabinet_id_param uuid)
returns setof public.cabinet_members
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  -- Vérifier que l'utilisateur est owner du cabinet
  if not exists (
    select 1 from cabinets 
    where id = cabinet_id_param and owner_id = auth.uid()
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

-- 9) Function pour supprimer un membre (bypass RLS)
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
  -- Récupérer le cabinet_id du membre
  select cabinet_id into v_cabinet_id
  from cabinet_members
  where id = member_id_param
  limit 1;
  
  if not found then
    raise exception 'Member not found';
  end if;
  
  -- Vérifier que l'utilisateur est owner du cabinet
  if not exists (
    select 1 from cabinets 
    where id = v_cabinet_id and owner_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;
  
  -- Supprimer le membre
  delete from cabinet_members where id = member_id_param;
end;
$$;

-- 10) Function pour inviter un membre (bypass RLS)
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
  -- Vérifier que l'utilisateur est owner du cabinet
  if not exists (
    select 1 from cabinets 
    where id = cabinet_id_param and owner_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;
  
  -- Chercher l'utilisateur par email
  select id into v_user_id
  from profiles
  where email = email_param
  limit 1;
  
  if v_user_id is not null then
    -- Vérifier si déjà membre
    if exists (
      select 1 from cabinet_members
      where cabinet_id = cabinet_id_param and user_id = v_user_id
    ) then
      raise exception 'Already a member';
    end if;
    
    -- Ajouter comme membre actif
    insert into cabinet_members (
      cabinet_id, user_id, email, nom, status, joined_at
    ) values (
      cabinet_id_param, v_user_id, email_param, nom_param, 'active', now()
    ) returning id into v_member_id;
  else
    -- Créer invitation en attente
    insert into cabinet_members (
      cabinet_id, user_id, email, nom, status, invitation_sent_at
    ) values (
      cabinet_id_param, auth.uid(), email_param, nom_param, 'pending', now()
    ) returning id into v_member_id;
  end if;
  
  return v_member_id;
end;
$$;

-- 11) Ajouter colonne cabinet_id aux profiles (optionnel, pour lier rapidement)
alter table public.profiles add column if not exists cabinet_id uuid references public.cabinets(id) on delete set null;

create index if not exists profiles_cabinet_idx on public.profiles(cabinet_id);
