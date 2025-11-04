-- Minimal app schema for per-account scoping
-- Run this in Supabase SQL Editor (project: neira) before deploying the frontend changes

-- 1) CLIENTS
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kyc_status text not null default 'Partiel', -- 'Complet' | 'Partiel'
  missing_info text,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

-- Only owner can manage their rows
create policy if not exists "clients_select_own" on public.clients
  for select using (owner_id = auth.uid());
create policy if not exists "clients_insert_own" on public.clients
  for insert with check (owner_id = auth.uid());
create policy if not exists "clients_update_own" on public.clients
  for update using (owner_id = auth.uid());
create policy if not exists "clients_delete_own" on public.clients
  for delete using (owner_id = auth.uid());

create index if not exists clients_owner_idx on public.clients(owner_id);
create index if not exists clients_created_at_idx on public.clients(created_at desc);

-- 2) DOCUMENTS
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  client_name text,
  status text not null default 'Brouillon', -- 'En cours' | 'Signé' | 'En attente' | 'Brouillon'
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy if not exists "documents_select_own" on public.documents
  for select using (owner_id = auth.uid());
create policy if not exists "documents_insert_own" on public.documents
  for insert with check (owner_id = auth.uid());
create policy if not exists "documents_update_own" on public.documents
  for update using (owner_id = auth.uid());
create policy if not exists "documents_delete_own" on public.documents
  for delete using (owner_id = auth.uid());

create index if not exists documents_owner_idx on public.documents(owner_id);
create index if not exists documents_updated_at_idx on public.documents(updated_at desc);
create index if not exists documents_status_idx on public.documents(status);

-- 3) SIGNATURES
create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  signer text not null,
  document_name text not null,
  status text not null default 'pending', -- 'pending' | 'completed' | 'awaiting' | 'en_attente'
  last_reminder_at timestamptz
);

alter table public.signatures enable row level security;

create policy if not exists "signatures_select_own" on public.signatures
  for select using (owner_id = auth.uid());
create policy if not exists "signatures_insert_own" on public.signatures
  for insert with check (owner_id = auth.uid());
create policy if not exists "signatures_update_own" on public.signatures
  for update using (owner_id = auth.uid());
create policy if not exists "signatures_delete_own" on public.signatures
  for delete using (owner_id = auth.uid());

create index if not exists signatures_owner_idx on public.signatures(owner_id);
create index if not exists signatures_status_idx on public.signatures(status);
create index if not exists signatures_last_reminder_idx on public.signatures(last_reminder_at desc nulls last);

-- 4) TASKS (optional for dashboard KPI)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy if not exists "tasks_select_own" on public.tasks
  for select using (owner_id = auth.uid());
create policy if not exists "tasks_insert_own" on public.tasks
  for insert with check (owner_id = auth.uid());
create policy if not exists "tasks_update_own" on public.tasks
  for update using (owner_id = auth.uid());
create policy if not exists "tasks_delete_own" on public.tasks
  for delete using (owner_id = auth.uid());

create index if not exists tasks_owner_idx on public.tasks(owner_id);
create index if not exists tasks_due_date_idx on public.tasks(due_date);

-- Helpful helper: automatically refresh updated_at on documents
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger if not exists documents_set_updated_at
before update on public.documents
for each row
execute procedure public.set_updated_at();
