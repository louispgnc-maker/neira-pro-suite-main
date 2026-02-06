-- Migration: Ensure creator becomes 'Fondateur' with full permissions
-- Date: 2025-11-06

-- Update existing rows using legacy 'owner' label to the new 'Fondateur'
update public.cabinet_members
set role_cabinet = 'Fondateur'
where role_cabinet = 'owner';

-- Replace create_cabinet to insert the creator as 'Fondateur'
drop function if exists public.create_cabinet(text, text, text, text, text, text, text, text, text);
drop function if exists public.create_cabinet(text, text, text, text, text, text, text, text);
create or replace function public.create_cabinet(
  nom_param text,
  raison_sociale_param text,
  siret_param text,
  adresse_param text,
  code_postal_param text,
  ville_param text,
  telephone_param text,
  role_param text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_cabinet_id uuid;
  v_code_acces text;
  v_nom_proprietaire text;
  v_user_email text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Générer un code d'accès unique
  v_code_acces := upper(substring(md5(random()::text) from 1 for 8));

  -- Créer le cabinet
  insert into cabinets (
    owner_id, nom, raison_sociale, siret, adresse, code_postal, ville,
    telephone, code_acces, role, email_verified
  ) values (
    v_user_id, nom_param, raison_sociale_param, siret_param, adresse_param,
    code_postal_param, ville_param, telephone_param, v_code_acces,
    role_param, true
  ) returning id into v_cabinet_id;

  -- Récupérer le nom et email depuis profiles/auth
  select 
    coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), u.email),
    u.email
    into v_nom_proprietaire, v_user_email
  from profiles p
  join auth.users u on u.id = p.id
  where p.id = v_user_id;

  -- Ajouter le fondateur comme membre
  insert into cabinet_members (
    cabinet_id, user_id, email, nom, role_cabinet, status, joined_at
  ) values (
    v_cabinet_id, v_user_id, v_user_email, v_nom_proprietaire, 'Fondateur', 'active', now()
  );

  return v_cabinet_id;
end;
$$;
