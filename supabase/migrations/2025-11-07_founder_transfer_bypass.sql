-- Migration: Add safe founder transfer bypass via GUC and admin function
-- Date: 2025-11-07

-- 1) Update trigger function to allow controlled bypass during ownership transfer
drop function if exists public.enforce_founder_integrity() cascade;
create or replace function public.enforce_founder_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_bypass text;
begin
  -- Allow controlled bypass within a transaction (used by transfer function)
  v_bypass := current_setting('app.allow_founder_transfer', true);
  if coalesce(v_bypass, '') = 'on' then
    return NEW;
  end if;

  select owner_id into v_owner from public.cabinets where id = NEW.cabinet_id limit 1;
  if v_owner is null then
    raise exception 'Cabinet not found';
  end if;

  -- Only cabinet owner can have 'Fondateur'
  if NEW.role_cabinet = 'Fondateur' and NEW.user_id <> v_owner then
    raise exception 'Only cabinet owner can be Fondateur';
  end if;

  -- Cabinet owner must remain 'Fondateur'
  if NEW.user_id = v_owner and NEW.role_cabinet <> 'Fondateur' then
    raise exception 'Cabinet owner must remain Fondateur';
  end if;

  return NEW;
end;
$$;

-- Recreate trigger (idempotent safety)
drop trigger if exists cabinet_members_enforce_founder on public.cabinet_members;
create trigger cabinet_members_enforce_founder
before insert or update on public.cabinet_members
for each row
execute procedure public.enforce_founder_integrity();

-- 2) Administrative function to transfer ownership safely
drop function if exists public.transfer_cabinet_ownership(uuid, uuid);
create or replace function public.transfer_cabinet_ownership(
  cabinet_id_param uuid,
  new_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_owner uuid;
  v_cab_role text;
begin
  -- Resolve current owner and cabinet role
  select owner_id, role into v_old_owner, v_cab_role
  from public.cabinets
  where id = cabinet_id_param
  limit 1;

  if v_old_owner is null then
    raise exception 'Cabinet not found';
  end if;

  -- Optional auth check: caller must be current owner
  if v_old_owner <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  -- Enable bypass within this transaction
  perform set_config('app.allow_founder_transfer', 'on', true);

  -- 1) Switch owner
  update public.cabinets
  set owner_id = new_owner_id
  where id = cabinet_id_param;

  -- 2) Demote former owner (now non-owner)
  update public.cabinet_members cm
  set role_cabinet = case v_cab_role when 'notaire' then 'Notaire' else 'Avocat Associé' end
  where cm.cabinet_id = cabinet_id_param
    and cm.user_id = v_old_owner;

  -- 3) Upsert new owner as 'Fondateur'
  insert into public.cabinet_members (cabinet_id, user_id, email, nom, role_cabinet, status, joined_at)
  select cabinet_id_param, u.id, u.email,
         coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), u.email),
         'Fondateur', 'active', now()
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = new_owner_id
  on conflict (cabinet_id, user_id)
  do update set role_cabinet = 'Fondateur', status = 'active';

  -- Disable bypass for the remainder of the transaction
  perform set_config('app.allow_founder_transfer', 'off', true);
end;
$$;
