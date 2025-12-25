-- Add signature add-ons tracking to cabinet_members table
-- This allows tracking purchased signature packages per member (not per cabinet)

-- Add column to store the extra signatures purchased per member
alter table public.cabinet_members
add column if not exists signature_addon_quantity integer default 0;

-- Add column to store the price of the addon per member
alter table public.cabinet_members
add column if not exists signature_addon_price numeric(10,2) default 0;

-- Add column to store when the addon was purchased per member
alter table public.cabinet_members
add column if not exists signature_addon_purchased_at timestamptz;

-- Create index for queries
create index if not exists cabinet_members_signature_addon_idx on public.cabinet_members(signature_addon_quantity) where signature_addon_quantity > 0;

-- Add comments
comment on column public.cabinet_members.signature_addon_quantity is 'Additional signatures purchased per month for this member (added to base plan limit)';
comment on column public.cabinet_members.signature_addon_price is 'Monthly price of the signature addon in euros for this member';
comment on column public.cabinet_members.signature_addon_purchased_at is 'When the current signature addon was purchased or last modified for this member';
