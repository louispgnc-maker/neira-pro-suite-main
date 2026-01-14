-- Create client_invitations table for managing client space invitations
create table if not exists client_invitations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  email text not null,
  token text unique not null,
  expires_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add index for faster lookups
create index if not exists idx_client_invitations_client_id on client_invitations(client_id);
create index if not exists idx_client_invitations_token on client_invitations(token);
create index if not exists idx_client_invitations_status on client_invitations(status);

-- RLS policies
alter table client_invitations enable row level security;

-- Cabinet members can view invitations for their clients
create policy "Cabinet members can view client invitations"
  on client_invitations
  for select
  using (
    exists (
      select 1 from clients c
      inner join cabinet_members cm on cm.cabinet_id = c.cabinet_id
      where c.id = client_invitations.client_id
      and cm.user_id = auth.uid()
    )
  );

-- Cabinet members can create invitations for their clients
create policy "Cabinet members can create client invitations"
  on client_invitations
  for insert
  with check (
    exists (
      select 1 from clients c
      inner join cabinet_members cm on cm.cabinet_id = c.cabinet_id
      where c.id = client_invitations.client_id
      and cm.user_id = auth.uid()
    )
  );

-- Cabinet members can update invitations for their clients
create policy "Cabinet members can update client invitations"
  on client_invitations
  for update
  using (
    exists (
      select 1 from clients c
      inner join cabinet_members cm on cm.cabinet_id = c.cabinet_id
      where c.id = client_invitations.client_id
      and cm.user_id = auth.uid()
    )
  );

-- Create updated_at trigger
create or replace function update_client_invitations_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_client_invitations_updated_at
  before update on client_invitations
  for each row
  execute function update_client_invitations_updated_at();
