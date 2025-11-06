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
as $$
  select exists (
    select 1 from public.cabinets
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

-- Policies pour CABINET_MEMBERS - ULTRA SIMPLE
-- 1. Les users peuvent gérer leurs propres memberships
drop policy if exists "cabinet_members_own_access" on public.cabinet_members;
create policy "cabinet_members_own_access" on public.cabinet_members
  for all using (user_id = auth.uid());

-- 2. Les owners de cabinets peuvent gérer les membres de LEURS cabinets via fonction
drop policy if exists "cabinet_members_owner_access" on public.cabinet_members;
create policy "cabinet_members_owner_access" on public.cabinet_members
  for all using (public.is_cabinet_owner(cabinet_id, auth.uid()));

-- 4) Trigger pour updated_at sur cabinets
drop trigger if exists cabinets_set_updated_at on public.cabinets;
create trigger cabinets_set_updated_at
before update on public.cabinets
for each row
execute procedure public.set_updated_at();

-- 5) Function pour générer un nouveau code d'accès
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

-- 6) Function pour rejoindre un cabinet via code
create or replace function public.join_cabinet_by_code(code_param text)
returns uuid
language plpgsql
security definer
as $$
declare
  cabinet_record record;
  user_profile record;
begin
  -- Trouver le cabinet avec ce code (SANS vérification email pour faciliter les tests)
  select * into cabinet_record
  from public.cabinets
  where code_acces = code_param;
  
  if not found then
    raise exception 'Code invalide';
  end if;
  
  -- Vérifier que le rôle de l'utilisateur correspond
  select * into user_profile
  from public.profiles
  where id = auth.uid();
  
  if user_profile.role != cabinet_record.role then
    raise exception 'Le rôle de votre compte ne correspond pas à ce cabinet';
  end if;
  
  -- Vérifier que l'utilisateur n'est pas déjà membre
  if exists (
    select 1 from public.cabinet_members
    where cabinet_id = cabinet_record.id and user_id = auth.uid()
  ) then
    raise exception 'Vous êtes déjà membre de ce cabinet';
  end if;
  
  -- Ajouter l'utilisateur comme membre
  insert into public.cabinet_members (
    cabinet_id,
    user_id,
    email,
    nom,
    status,
    joined_at
  ) values (
    cabinet_record.id,
    auth.uid(),
    user_profile.email,
    coalesce(user_profile.first_name || ' ' || user_profile.last_name, user_profile.email),
    'active',
    now()
  );
  
  return cabinet_record.id;
end;
$$;

-- 7) Function pour récupérer les cabinets d'un utilisateur (bypass RLS)
create or replace function public.get_user_cabinets()
returns setof public.cabinets
language plpgsql
security definer
stable
as $$
begin
  return query
  select c.*
  from public.cabinets c
  where c.owner_id = auth.uid()
     or c.id in (
       select cm.cabinet_id
       from public.cabinet_members cm
       where cm.user_id = auth.uid()
         and cm.status = 'active'
     );
end;
$$;

-- 8) Ajouter colonne cabinet_id aux profiles (optionnel, pour lier rapidement)
alter table public.profiles add column if not exists cabinet_id uuid references public.cabinets(id) on delete set null;

create index if not exists profiles_cabinet_idx on public.profiles(cabinet_id);
