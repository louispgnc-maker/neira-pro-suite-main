-- Safe migration to align schema with the app (clients, contrats, client_contrats)
-- Run this file in Supabase SQL Editor (Upload/Open File → Run)

-- 0) Extensions
create extension if not exists pgcrypto;

-- 1) Helper function for updated_at triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) CONTRATS table (if missing)
create table if not exists public.contrats (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  type text not null,
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

drop trigger if exists contrats_set_updated_at on public.contrats;
create trigger contrats_set_updated_at
before update on public.contrats
for each row
execute procedure public.set_updated_at();

-- 3) CLIENTS table alignment (add missing columns only)
-- Base
alter table public.clients add column if not exists owner_id uuid;
alter table public.clients add column if not exists name text;
alter table public.clients add column if not exists role text default 'avocat';
alter table public.clients add column if not exists created_at timestamptz default now();

-- Personal info
alter table public.clients add column if not exists nom text;
alter table public.clients add column if not exists prenom text;
alter table public.clients add column if not exists date_naissance date;
alter table public.clients add column if not exists lieu_naissance text;
alter table public.clients add column if not exists adresse text;
alter table public.clients add column if not exists telephone text;
alter table public.clients add column if not exists email text;
alter table public.clients add column if not exists nationalite text;
alter table public.clients add column if not exists sexe text;

-- Identification
alter table public.clients add column if not exists type_identite text;
alter table public.clients add column if not exists numero_identite text;
alter table public.clients add column if not exists date_expiration_identite date;
alter table public.clients add column if not exists id_doc_path text;

-- Professional
alter table public.clients add column if not exists profession text;
alter table public.clients add column if not exists employeur text;
alter table public.clients add column if not exists adresse_professionnelle text;
alter table public.clients add column if not exists siret text;
alter table public.clients add column if not exists situation_fiscale text;

-- Legal
alter table public.clients add column if not exists type_dossier text;
alter table public.clients add column if not exists contrat_souhaite text;
alter table public.clients add column if not exists historique_litiges text;
alter table public.clients add column if not exists pieces_justificatives text;

-- Consents / KYC
alter table public.clients add column if not exists consentement_rgpd boolean default false;
alter table public.clients add column if not exists signature_mandat boolean default false;
alter table public.clients add column if not exists kyc_status text default 'Partiel';

-- RLS and indexes for clients (safe)
alter table public.clients enable row level security;

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

-- 4) CLIENTS <-> CONTRATS association table
create table if not exists public.client_contrats (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  contrat_id uuid not null references public.contrats(id) on delete cascade,
  role text not null default 'avocat',
  created_at timestamptz not null default now()
);

alter table public.client_contrats enable row level security;

drop policy if exists "client_contrats_select_own" on public.client_contrats;
create policy "client_contrats_select_own" on public.client_contrats
  for select using (owner_id = auth.uid());
drop policy if exists "client_contrats_insert_own" on public.client_contrats;
create policy "client_contrats_insert_own" on public.client_contrats
  for insert with check (owner_id = auth.uid());
drop policy if exists "client_contrats_update_own" on public.client_contrats;
create policy "client_contrats_update_own" on public.client_contrats
  for update using (owner_id = auth.uid());
drop policy if exists "client_contrats_delete_own" on public.client_contrats;
create policy "client_contrats_delete_own" on public.client_contrats
  for delete using (owner_id = auth.uid());

create index if not exists client_contrats_owner_idx on public.client_contrats(owner_id);
create index if not exists client_contrats_client_idx on public.client_contrats(client_id);
create index if not exists client_contrats_contrat_idx on public.client_contrats(contrat_id);
create index if not exists client_contrats_role_idx on public.client_contrats(role);
