-- Add subscription_plan column to profiles table
-- This will store the subscription tier: 'Neira Essentiel', 'Neira Professionnel', 'Neira Cabinet+'

alter table public.profiles 
add column if not exists subscription_plan text default 'Neira Essentiel';

-- Add index for faster queries on subscription plans
create index if not exists profiles_subscription_plan_idx on public.profiles(subscription_plan);

-- Add comment for documentation
comment on column public.profiles.subscription_plan is 'User subscription tier: Neira Essentiel, Neira Professionnel, or Neira Cabinet+';
