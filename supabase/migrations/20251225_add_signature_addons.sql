-- Add signature add-ons tracking to cabinets table
-- This allows tracking purchased signature packages

-- Add column to store the extra signatures purchased
alter table public.cabinets
add column if not exists signature_addon_quantity integer default 0;

-- Add column to store the price of the addon
alter table public.cabinets
add column if not exists signature_addon_price numeric(10,2) default 0;

-- Add column to store when the addon was purchased
alter table public.cabinets
add column if not exists signature_addon_purchased_at timestamptz;

-- Create index for queries
create index if not exists cabinets_signature_addon_idx on public.cabinets(signature_addon_quantity) where signature_addon_quantity > 0;

-- Add comments
comment on column public.cabinets.signature_addon_quantity is 'Additional signatures purchased per month (added to base plan limit)';
comment on column public.cabinets.signature_addon_price is 'Monthly price of the signature addon in euros';
comment on column public.cabinets.signature_addon_purchased_at is 'When the current signature addon was purchased or last modified';
