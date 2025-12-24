-- Modification de get_user_cabinets pour retourner aussi le status du membre
-- Plus de filtre status='active' - un membre est un membre, point

drop function if exists public.get_user_cabinets();

create or replace function public.get_user_cabinets()
returns table (
  id uuid,
  nom text,
  code_acces text,
  owner_id uuid,
  role text,
  raison_sociale text,
  adresse text,
  telephone text,
  email text,
  subscription_plan text,
  max_members integer,
  created_at timestamptz,
  updated_at timestamptz,
  status text  -- Status du membre depuis cabinet_members (conservé pour compatibilité)
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return query
  select 
    c.id,
    c.nom,
    c.code_acces,
    c.owner_id,
    c.role,
    c.raison_sociale,
    c.adresse,
    c.telephone,
    c.email,
    c.subscription_plan,
    c.max_members,
    c.created_at,
    c.updated_at,
    COALESCE(cm.status, 'active') as status
  from cabinets c
  left join cabinet_members cm on cm.cabinet_id = c.id and cm.user_id = auth.uid()
  where c.owner_id = auth.uid()
     or c.id in (
       select cm2.cabinet_id
       from cabinet_members cm2
       where cm2.user_id = auth.uid()
     );
end;
$$;

COMMENT ON FUNCTION public.get_user_cabinets() IS 
'Retourne tous les cabinets dont l''utilisateur est propriétaire ou membre (peu importe le status)';
