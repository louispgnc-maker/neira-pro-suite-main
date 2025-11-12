-- Migration: create cabinet_clients table for shared clients
-- Date: 2025-11-12

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create table for clients shared into a cabinet
create table if not exists public.cabinet_clients (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid not null references public.cabinets(id) on delete cascade,

  -- Reference to the original client
  client_id uuid references public.clients(id) on delete cascade,

  -- Metadata
  shared_by uuid not null references auth.users(id) on delete cascade,
  shared_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cabinet_clients_cabinet_idx on public.cabinet_clients(cabinet_id);
create index if not exists cabinet_clients_shared_by_idx on public.cabinet_clients(shared_by);

-- Enable RLS and policies similar to other cabinet_* tables
alter table public.cabinet_clients enable row level security;

drop policy if exists "cabinet_members_read_clients" on public.cabinet_clients;
create policy "cabinet_members_read_clients" on public.cabinet_clients
  for select using (
    cabinet_id in (
      select cm.cabinet_id from cabinet_members cm
      where cm.user_id = auth.uid() and cm.status = 'active'
    )
  );

drop policy if exists "cabinet_members_insert_clients" on public.cabinet_clients;
create policy "cabinet_members_insert_clients" on public.cabinet_clients
  for insert with check (
    cabinet_id in (
      select cm.cabinet_id from cabinet_members cm
      where cm.user_id = auth.uid() and cm.status = 'active'
    )
  );

drop policy if exists "cabinet_owner_or_sharer_delete_clients" on public.cabinet_clients;
create policy "cabinet_owner_or_sharer_delete_clients" on public.cabinet_clients
  for delete using (
    shared_by = auth.uid() OR public.is_cabinet_owner(cabinet_id, auth.uid())
  );
