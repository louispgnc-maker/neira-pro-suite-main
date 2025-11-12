-- Migration: ensure unique constraint for cabinet_clients (client_id, cabinet_id)
-- Date: 2025-11-12

-- Add a unique constraint so ON CONFLICT (client_id, cabinet_id) works in RPCs
alter table if exists public.cabinet_clients
  add constraint if not exists cabinet_clients_client_cabinet_unique unique (client_id, cabinet_id);

-- Also create an index to speed up lookups
create unique index if not exists idx_cabinet_clients_client_cabinet on public.cabinet_clients(client_id, cabinet_id);
