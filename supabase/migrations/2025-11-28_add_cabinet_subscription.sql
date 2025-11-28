-- Add subscription fields to cabinets table
-- This allows tracking subscription limits per cabinet

alter table public.cabinets
add column if not exists subscription_plan text default 'essentiel' check (subscription_plan in ('essentiel', 'professionnel', 'cabinet-plus')),
add column if not exists max_members integer default 1,
add column if not exists max_storage_go integer default 20,
add column if not exists max_dossiers integer default 100,
add column if not exists max_clients integer default 30,
add column if not exists max_signatures_per_month integer default 15,
add column if not exists billing_period text default 'monthly' check (billing_period in ('monthly', 'yearly')),
add column if not exists subscription_status text default 'active' check (subscription_status in ('active', 'cancelled', 'expired', 'trial')),
add column if not exists subscription_started_at timestamptz default now(),
add column if not exists subscription_ends_at timestamptz;

-- Create indexes for subscription queries
create index if not exists cabinets_subscription_plan_idx on public.cabinets(subscription_plan);
create index if not exists cabinets_subscription_status_idx on public.cabinets(subscription_status);
create index if not exists cabinets_owner_id_idx on public.cabinets(owner_id);

-- Add comments
comment on column public.cabinets.subscription_plan is 'Cabinet subscription plan: essentiel, professionnel, or cabinet-plus';
comment on column public.cabinets.max_members is 'Maximum number of members allowed in the cabinet';
comment on column public.cabinets.max_storage_go is 'Maximum storage in GB';
comment on column public.cabinets.max_dossiers is 'Maximum number of active dossiers';
comment on column public.cabinets.max_clients is 'Maximum number of active clients';
comment on column public.cabinets.max_signatures_per_month is 'Maximum signatures per month (null = unlimited)';
comment on column public.cabinets.billing_period is 'Billing cycle: monthly or yearly';
comment on column public.cabinets.subscription_status is 'Current subscription status';
