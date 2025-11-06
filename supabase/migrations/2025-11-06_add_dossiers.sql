-- Create dossiers and association tables (idempotent)
create table if not exists public.dossiers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'avocat',
  title text not null,
  client_id uuid references public.clients(id) on delete set null,
  status text not null default 'Ouvert',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dossiers enable row level security;

drop policy if exists "dossiers_select_own" on public.dossiers;
create policy "dossiers_select_own" on public.dossiers for select using (owner_id = auth.uid());

drop policy if exists "dossiers_insert_own" on public.dossiers;
create policy "dossiers_insert_own" on public.dossiers for insert with check (owner_id = auth.uid());

drop policy if exists "dossiers_update_own" on public.dossiers;
create policy "dossiers_update_own" on public.dossiers for update using (owner_id = auth.uid());

drop policy if exists "dossiers_delete_own" on public.dossiers;
create policy "dossiers_delete_own" on public.dossiers for delete using (owner_id = auth.uid());

create index if not exists dossiers_owner_idx on public.dossiers(owner_id);
create index if not exists dossiers_role_idx on public.dossiers(role);
create index if not exists dossiers_status_idx on public.dossiers(status);
create index if not exists dossiers_created_at_idx on public.dossiers(created_at desc);

-- helper trigger function must exist already (set_updated_at)
drop trigger if exists dossiers_set_updated_at on public.dossiers;
create trigger dossiers_set_updated_at before update on public.dossiers for each row execute procedure public.set_updated_at();

-- Association tables
create table if not exists public.dossier_clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  role text not null default 'avocat',
  created_at timestamptz not null default now()
);

alter table public.dossier_clients enable row level security;

drop policy if exists "dossier_clients_select_own" on public.dossier_clients;
create policy "dossier_clients_select_own" on public.dossier_clients for select using (owner_id = auth.uid());

drop policy if exists "dossier_clients_insert_own" on public.dossier_clients;
create policy "dossier_clients_insert_own" on public.dossier_clients for insert with check (owner_id = auth.uid());

drop policy if exists "dossier_clients_update_own" on public.dossier_clients;
create policy "dossier_clients_update_own" on public.dossier_clients for update using (owner_id = auth.uid());

drop policy if exists "dossier_clients_delete_own" on public.dossier_clients;
create policy "dossier_clients_delete_own" on public.dossier_clients for delete using (owner_id = auth.uid());

create index if not exists dossier_clients_owner_idx on public.dossier_clients(owner_id);
create index if not exists dossier_clients_dossier_idx on public.dossier_clients(dossier_id);
create index if not exists dossier_clients_client_idx on public.dossier_clients(client_id);
create index if not exists dossier_clients_role_idx on public.dossier_clients(role);

create table if not exists public.dossier_contrats (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  contrat_id uuid not null references public.contrats(id) on delete cascade,
  role text not null default 'avocat',
  created_at timestamptz not null default now()
);

alter table public.dossier_contrats enable row level security;

drop policy if exists "dossier_contrats_select_own" on public.dossier_contrats;
create policy "dossier_contrats_select_own" on public.dossier_contrats for select using (owner_id = auth.uid());

drop policy if exists "dossier_contrats_insert_own" on public.dossier_contrats;
create policy "dossier_contrats_insert_own" on public.dossier_contrats for insert with check (owner_id = auth.uid());

drop policy if exists "dossier_contrats_update_own" on public.dossier_contrats;
create policy "dossier_contrats_update_own" on public.dossier_contrats for update using (owner_id = auth.uid());

drop policy if exists "dossier_contrats_delete_own" on public.dossier_contrats;
create policy "dossier_contrats_delete_own" on public.dossier_contrats for delete using (owner_id = auth.uid());

create index if not exists dossier_contrats_owner_idx on public.dossier_contrats(owner_id);
create index if not exists dossier_contrats_dossier_idx on public.dossier_contrats(dossier_id);
create index if not exists dossier_contrats_contrat_idx on public.dossier_contrats(contrat_id);
create index if not exists dossier_contrats_role_idx on public.dossier_contrats(role);

create table if not exists public.dossier_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  role text not null default 'avocat',
  created_at timestamptz not null default now()
);

alter table public.dossier_documents enable row level security;

drop policy if exists "dossier_documents_select_own" on public.dossier_documents;
create policy "dossier_documents_select_own" on public.dossier_documents for select using (owner_id = auth.uid());

drop policy if exists "dossier_documents_insert_own" on public.dossier_documents;
create policy "dossier_documents_insert_own" on public.dossier_documents for insert with check (owner_id = auth.uid());

drop policy if exists "dossier_documents_update_own" on public.dossier_documents;
create policy "dossier_documents_update_own" on public.dossier_documents for update using (owner_id = auth.uid());

drop policy if exists "dossier_documents_delete_own" on public.dossier_documents;
create policy "dossier_documents_delete_own" on public.dossier_documents for delete using (owner_id = auth.uid());

create index if not exists dossier_documents_owner_idx on public.dossier_documents(owner_id);
create index if not exists dossier_documents_dossier_idx on public.dossier_documents(dossier_id);
create index if not exists dossier_documents_document_idx on public.dossier_documents(document_id);
create index if not exists dossier_documents_role_idx on public.dossier_documents(role);
