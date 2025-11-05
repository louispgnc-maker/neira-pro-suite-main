-- Minimal app schema for per-account scoping
-- Run this in Supabase SQL Editor (project: neira) before deploying the frontend changes

-- 0) PROFILES (user metadata and role)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  role text not null default 'avocat', -- 'avocat' | 'notaire'
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

create index if not exists profiles_role_idx on public.profiles(role);

-- Trigger to automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'avocat')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 1) CLIENTS
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kyc_status text not null default 'Partiel', -- 'Complet' | 'Partiel'
  missing_info text,
  role text not null default 'avocat', -- 'avocat' | 'notaire'
  created_at timestamptz not null default now(),
  -- Informations personnelles
  nom text,
  prenom text,
  date_naissance date,
  lieu_naissance text,
  adresse text,
  telephone text,
  email text,
  nationalite text,
  sexe text,
  -- Identification officielle
  type_identite text,
  numero_identite text,
  date_expiration_identite date,
  id_doc_path text, -- Chemin vers le scan/photo de la pièce d'identité dans storage
  -- Situation professionnelle / financière
  profession text,
  employeur text,
  adresse_professionnelle text,
  siret text,
  situation_fiscale text,
  -- Situation juridique / dossier
  type_dossier text,
  contrat_souhaite text,
  historique_litiges text,
  pieces_justificatives text,
  -- Consentements et mentions légales
  consentement_rgpd boolean default false,
  signature_mandat boolean default false
);

alter table public.clients enable row level security;

-- Only owner can manage their rows
drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own" on public.clients
  for select using (owner_id = auth.uid());
drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own" on public.clients
  for insert with check (owner_id = auth.uid());
drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own" on public.clients
  for update using (owner_id = auth.uid());
drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own" on public.clients
  for delete using (owner_id = auth.uid());

create index if not exists clients_owner_idx on public.clients(owner_id);
create index if not exists clients_created_at_idx on public.clients(created_at desc);
create index if not exists clients_role_idx on public.clients(role);

-- 2) DOCUMENTS
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  client_name text,
  status text not null default 'Brouillon', -- 'En cours' | 'Signé' | 'En attente' | 'Brouillon'
  role text not null default 'avocat', -- 'avocat' | 'notaire'
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;

drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own" on public.documents
  for select using (owner_id = auth.uid());
drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own" on public.documents
  for insert with check (owner_id = auth.uid());
drop policy if exists "documents_update_own" on public.documents;
create policy "documents_update_own" on public.documents
  for update using (owner_id = auth.uid());
drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own" on public.documents
  for delete using (owner_id = auth.uid());

create index if not exists documents_owner_idx on public.documents(owner_id);
create index if not exists documents_updated_at_idx on public.documents(updated_at desc);
create index if not exists documents_status_idx on public.documents(status);
create index if not exists documents_role_idx on public.documents(role);

-- Add storage_path column to link to Supabase Storage path
alter table public.documents add column if not exists storage_path text;

-- 3) SIGNATURES
create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  signer text not null,
  document_name text not null,
  status text not null default 'pending', -- 'pending' | 'completed' | 'awaiting' | 'en_attente'
  role text not null default 'avocat', -- 'avocat' | 'notaire'
  last_reminder_at timestamptz
);

alter table public.signatures enable row level security;

drop policy if exists "signatures_select_own" on public.signatures;
create policy "signatures_select_own" on public.signatures
  for select using (owner_id = auth.uid());
drop policy if exists "signatures_insert_own" on public.signatures;
create policy "signatures_insert_own" on public.signatures
  for insert with check (owner_id = auth.uid());
drop policy if exists "signatures_update_own" on public.signatures;
create policy "signatures_update_own" on public.signatures
  for update using (owner_id = auth.uid());
drop policy if exists "signatures_delete_own" on public.signatures;
create policy "signatures_delete_own" on public.signatures
  for delete using (owner_id = auth.uid());

create index if not exists signatures_owner_idx on public.signatures(owner_id);
create index if not exists signatures_status_idx on public.signatures(status);
create index if not exists signatures_last_reminder_idx on public.signatures(last_reminder_at desc nulls last);
create index if not exists signatures_role_idx on public.signatures(role);

-- 4) TASKS (optional for dashboard KPI)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  due_date date,
  done boolean not null default false,
  role text not null default 'avocat', -- 'avocat' | 'notaire'
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
  for select using (owner_id = auth.uid());
drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks
  for insert with check (owner_id = auth.uid());
drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks
  for update using (owner_id = auth.uid());
drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks
  for delete using (owner_id = auth.uid());

create index if not exists tasks_owner_idx on public.tasks(owner_id);
create index if not exists tasks_due_date_idx on public.tasks(due_date);
create index if not exists tasks_role_idx on public.tasks(role);

-- Helpful helper: automatically refresh updated_at on documents
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
before update on public.documents
for each row
execute procedure public.set_updated_at();

-- 5) CONTRATS
create table if not exists public.contrats (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null, -- 'Immobilier', 'Famille & Patrimoine', 'Succession', 'Procurations', etc.
  type text not null, -- ex: 'Compromis de vente / Promesse unilatérale de vente'
  role text not null default 'notaire', -- 'avocat' | 'notaire'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contrats enable row level security;

drop policy if exists "contrats_select_own" on public.contrats;
create policy "contrats_select_own" on public.contrats
  for select using (owner_id = auth.uid());
drop policy if exists "contrats_insert_own" on public.contrats;
create policy "contrats_insert_own" on public.contrats
  for insert with check (owner_id = auth.uid());
drop policy if exists "contrats_update_own" on public.contrats;
create policy "contrats_update_own" on public.contrats
  for update using (owner_id = auth.uid());
drop policy if exists "contrats_delete_own" on public.contrats;
create policy "contrats_delete_own" on public.contrats
  for delete using (owner_id = auth.uid());

create index if not exists contrats_owner_idx on public.contrats(owner_id);
create index if not exists contrats_category_idx on public.contrats(category);
create index if not exists contrats_role_idx on public.contrats(role);
create index if not exists contrats_created_at_idx on public.contrats(created_at desc);

-- Trigger pour mettre à jour updated_at
drop trigger if exists contrats_set_updated_at on public.contrats;
create trigger contrats_set_updated_at
before update on public.contrats
for each row
execute procedure public.set_updated_at();

-- 6) STORAGE POLICIES (bucket: documents)
-- Allow authenticated users to upload/read/delete only in their own folder (first path segment = auth.uid())
-- Example stored path: <user_id>/timestamp-filename.pdf

-- Enable RLS on storage.objects is managed by Supabase; we add bucket-specific policies
drop policy if exists "documents_storage_upload_own" on storage.objects;
create policy "documents_storage_upload_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_storage_read_own" on storage.objects;
create policy "documents_storage_read_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_storage_delete_own" on storage.objects;
create policy "documents_storage_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
