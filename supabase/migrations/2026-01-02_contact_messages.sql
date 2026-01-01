-- Migration: Table pour stocker les messages de contact

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  
  -- Informations de contact
  first_name text not null,
  last_name text not null,
  email text not null,
  company text,
  
  -- Message
  subject text not null,
  message text not null,
  
  -- Statut
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'closed')),
  
  -- Métadonnées
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index
create index if not exists idx_contact_messages_user_id on public.contact_messages(user_id);
create index if not exists idx_contact_messages_status on public.contact_messages(status);
create index if not exists idx_contact_messages_created_at on public.contact_messages(created_at desc);

-- RLS
alter table public.contact_messages enable row level security;

-- Policy: Les utilisateurs peuvent créer leurs propres messages
create policy "Users can create their own contact messages"
  on public.contact_messages
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent voir leurs propres messages
create policy "Users can view their own contact messages"
  on public.contact_messages
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Trigger pour updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.contact_messages
  for each row
  execute function public.handle_updated_at();
