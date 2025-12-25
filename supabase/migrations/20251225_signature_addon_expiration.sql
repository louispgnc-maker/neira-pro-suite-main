-- Add expiration date for signature addons
-- Addons expire at the end of the current billing cycle

-- Add column to store when the addon expires (end of billing cycle)
alter table public.cabinet_members
add column if not exists signature_addon_expires_at timestamptz;

-- Add comment
comment on column public.cabinet_members.signature_addon_expires_at is 'Date when the signature addon expires (end of current billing cycle). Addon is only valid if expires_at > now()';

-- Note: The billing cycle start date is stored in cabinets.subscription_started_at
-- When purchasing an addon, we calculate expires_at = next renewal date based on subscription_started_at
