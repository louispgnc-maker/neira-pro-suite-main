-- Add user_id column to clients table for linking to auth.users
alter table clients add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Add index for faster lookups
create index if not exists idx_clients_user_id on clients(user_id);

-- Add unique constraint to ensure one user per client
create unique index if not exists idx_clients_user_id_unique on clients(user_id) where user_id is not null;
