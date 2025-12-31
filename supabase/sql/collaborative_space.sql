-- Tables pour l'espace collaboratif du cabinet
-- Documents, Dossiers et Contrats partagés

-- 1) Table des documents partagés
create table if not exists public.cabinet_documents (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid not null references public.cabinets(id) on delete cascade,
  
  -- Référence au document original (nullable si upload direct)
  document_id uuid references public.documents(id) on delete cascade,
  
  -- Infos du document
  title text not null,
  description text,
  file_url text,
  file_name text,
  file_size bigint,
  file_type text,
  
  -- Métadonnées
  shared_by uuid not null references auth.users(id) on delete cascade,
  shared_at timestamptz not null default now(),
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cabinet_documents_cabinet_idx on public.cabinet_documents(cabinet_id);
create index if not exists cabinet_documents_shared_by_idx on public.cabinet_documents(shared_by);

-- 2) Table des dossiers partagés
create table if not exists public.cabinet_dossiers (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid not null references public.cabinets(id) on delete cascade,
  
  -- Référence au dossier original (nullable si création directe)
  dossier_id uuid references public.dossiers(id) on delete cascade,
  
  -- Infos du dossier
  title text not null,
  description text,
  status text,
  client_name text,
  
  -- Métadonnées
  shared_by uuid not null references auth.users(id) on delete cascade,
  shared_at timestamptz not null default now(),
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add a column to reference created cabinet_documents for attachments (helps clients open attachments)
alter table public.cabinet_dossiers add column if not exists attached_document_ids uuid[];

create index if not exists cabinet_dossiers_cabinet_idx on public.cabinet_dossiers(cabinet_id);
create index if not exists cabinet_dossiers_shared_by_idx on public.cabinet_dossiers(shared_by);

-- 3) Table des contrats partagés
create table if not exists public.cabinet_contrats (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid not null references public.cabinets(id) on delete cascade,
  
  -- Référence au contrat original (nullable si création directe)
  contrat_id uuid references public.contrats(id) on delete cascade,
  
  -- Infos du contrat
  title text not null,
  description text,
  category text,
  contrat_type text,
  
  -- Métadonnées
  shared_by uuid not null references auth.users(id) on delete cascade,
  shared_at timestamptz not null default now(),
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cabinet_contrats_cabinet_idx on public.cabinet_contrats(cabinet_id);
create index if not exists cabinet_contrats_shared_by_idx on public.cabinet_contrats(shared_by);

-- 4) RLS Policies
alter table public.cabinet_documents enable row level security;
alter table public.cabinet_dossiers enable row level security;
alter table public.cabinet_contrats enable row level security;

-- Policy: Les membres du cabinet peuvent lire
drop policy if exists "cabinet_members_read_documents" on public.cabinet_documents;
create policy "cabinet_members_read_documents" on public.cabinet_documents
  for select using (
    cabinet_id in (
      select cm.cabinet_id from cabinet_members cm
      where cm.user_id = auth.uid() and cm.status = 'active'
    )
  );

drop policy if exists "cabinet_members_insert_documents" on public.cabinet_documents;
create policy "cabinet_members_insert_documents" on public.cabinet_documents
  for insert with check (
    cabinet_id in (
      select cm.cabinet_id from cabinet_members cm
      where cm.user_id = auth.uid() and cm.status = 'active'
    )
  );

drop policy if exists "cabinet_members_read_dossiers" on public.cabinet_dossiers;
create policy "cabinet_members_read_dossiers" on public.cabinet_dossiers
  for select using (
    cabinet_id in (
      select cm.cabinet_id from cabinet_members cm
      where cm.user_id = auth.uid() and cm.status = 'active'
    )
  );

drop policy if exists "cabinet_members_insert_dossiers" on public.cabinet_dossiers;
create policy "cabinet_members_insert_dossiers" on public.cabinet_dossiers
  for insert with check (
    cabinet_id in (
      select cm.cabinet_id from cabinet_members cm
      where cm.user_id = auth.uid() and cm.status = 'active'
    )
  );

drop policy if exists "cabinet_members_read_contrats" on public.cabinet_contrats;
create policy "cabinet_members_read_contrats" on public.cabinet_contrats
  for select using (
    cabinet_id in (
      select cm.cabinet_id from cabinet_members cm
      where cm.user_id = auth.uid() and cm.status = 'active'
    )
  );

drop policy if exists "cabinet_members_insert_contrats" on public.cabinet_contrats;
create policy "cabinet_members_insert_contrats" on public.cabinet_contrats
  for insert with check (
    cabinet_id in (
      select cm.cabinet_id from cabinet_members cm
      where cm.user_id = auth.uid() and cm.status = 'active'
    )
  );

-- Policy: Seul celui qui a partagé peut modifier son contrat
drop policy if exists "cabinet_sharer_update_contrats" on public.cabinet_contrats;
create policy "cabinet_sharer_update_contrats" on public.cabinet_contrats
  for update using (
    shared_by = auth.uid()
  )
  with check (
    shared_by = auth.uid()
  );

-- Policy: Seul celui qui a partagé peut supprimer son élément partagé
-- Ensure we drop any older policy names and the current intended name to avoid "policy already exists" errors
drop policy if exists "cabinet_owner_delete_documents" on public.cabinet_documents;
drop policy if exists "cabinet_owner_or_sharer_delete_documents" on public.cabinet_documents;
create policy "cabinet_owner_or_sharer_delete_documents" on public.cabinet_documents
  for delete using (
    shared_by = auth.uid() OR public.is_cabinet_owner(cabinet_id, auth.uid())
  );

-- Ensure we drop any older policy names and the current intended name to avoid "policy already exists" errors
drop policy if exists "cabinet_owner_delete_dossiers" on public.cabinet_dossiers;
drop policy if exists "cabinet_owner_or_sharer_delete_dossiers" on public.cabinet_dossiers;
create policy "cabinet_owner_or_sharer_delete_dossiers" on public.cabinet_dossiers
  for delete using (
    shared_by = auth.uid() OR public.is_cabinet_owner(cabinet_id, auth.uid())
  );

-- Ensure we drop any older policy names and the current intended name to avoid "policy already exists" errors
drop policy if exists "cabinet_owner_delete_contrats" on public.cabinet_contrats;
drop policy if exists "cabinet_owner_or_sharer_delete_contrats" on public.cabinet_contrats;
create policy "cabinet_owner_or_sharer_delete_contrats" on public.cabinet_contrats
  for delete using (
    shared_by = auth.uid() OR public.is_cabinet_owner(cabinet_id, auth.uid())
  );

-- 5) Triggers pour updated_at
drop trigger if exists cabinet_documents_set_updated_at on public.cabinet_documents;
create trigger cabinet_documents_set_updated_at
before update on public.cabinet_documents
for each row
execute procedure public.set_updated_at();

drop trigger if exists cabinet_dossiers_set_updated_at on public.cabinet_dossiers;
create trigger cabinet_dossiers_set_updated_at
before update on public.cabinet_dossiers
for each row
execute procedure public.set_updated_at();

drop trigger if exists cabinet_contrats_set_updated_at on public.cabinet_contrats;
create trigger cabinet_contrats_set_updated_at
before update on public.cabinet_contrats
for each row
execute procedure public.set_updated_at();

-- 6) Fonctions RPC pour récupérer les données

-- Récupérer les documents partagés du cabinet
drop function if exists public.get_cabinet_documents(uuid);
create or replace function public.get_cabinet_documents(cabinet_id_param uuid)
returns setof public.cabinet_documents
language sql
security definer
stable
set search_path = public
as $$
  select cd.* from cabinet_documents cd
  where cd.cabinet_id = cabinet_id_param
    and cd.cabinet_id in (
      select cm.cabinet_id from cabinet_members cm
      where cm.user_id = auth.uid() and cm.status = 'active'
    )
  order by cd.shared_at desc;
$$;

-- Récupérer les dossiers partagés du cabinet
drop function if exists public.get_cabinet_dossiers(uuid);
create or replace function public.get_cabinet_dossiers(cabinet_id_param uuid)
returns setof public.cabinet_dossiers
language sql
security definer
stable
set search_path = public
as $$
  select cd.* from cabinet_dossiers cd
  where cd.cabinet_id = cabinet_id_param
    and cd.cabinet_id in (
      select cm.cabinet_id from cabinet_members cm
      where cm.user_id = auth.uid() and cm.status = 'active'
    )
  order by cd.shared_at desc;
$$;

-- Récupérer les contrats partagés du cabinet
drop function if exists public.get_cabinet_contrats(uuid);
create or replace function public.get_cabinet_contrats(cabinet_id_param uuid)
returns setof public.cabinet_contrats
language sql
security definer
stable
set search_path = public
as $$
  select cc.* from cabinet_contrats cc
  where cc.cabinet_id = cabinet_id_param
    and cc.cabinet_id in (
      select cm.cabinet_id from cabinet_members cm
      where cm.user_id = auth.uid() and cm.status = 'active'
    )
  order by cc.shared_at desc;
$$;

-- Partager un document existant au cabinet
-- share_document_to_cabinet disabled: replaced with explicit exception to prevent sharing.
drop function if exists public.share_document_to_cabinet(uuid, uuid, text, text);
create or replace function public.share_document_to_cabinet(
  cabinet_id_param uuid,
  document_id_param uuid,
  title_param text,
  description_param text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Sharing disabled: share_document_to_cabinet has been removed.';
end;
$$;

-- RPCs sécurisés pour suppression (share owner OR cabinet founder)
drop function if exists public.delete_cabinet_document(uuid);
create or replace function public.delete_cabinet_document(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cabinet_id uuid;
  v_shared_by uuid;
begin
  select cabinet_id, shared_by into v_cabinet_id, v_shared_by
  from cabinet_documents where id = p_id limit 1;

  if not found then
    raise exception 'Document not found';
  end if;

  if v_shared_by = auth.uid() or public.is_cabinet_owner(v_cabinet_id, auth.uid()) then
    delete from cabinet_documents where id = p_id;
  else
    raise exception 'Unauthorized to delete this document';
  end if;
end;
$$;

drop function if exists public.delete_cabinet_dossier(uuid);
create or replace function public.delete_cabinet_dossier(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cabinet_id uuid;
  v_shared_by uuid;
begin
  select cabinet_id, shared_by into v_cabinet_id, v_shared_by
  from cabinet_dossiers where id = p_id limit 1;

  if not found then
    raise exception 'Dossier not found';
  end if;

  if v_shared_by = auth.uid() or public.is_cabinet_owner(v_cabinet_id, auth.uid()) then
    delete from cabinet_dossiers where id = p_id;
  else
    raise exception 'Unauthorized to delete this dossier';
  end if;
end;
$$;

drop function if exists public.delete_cabinet_contrat(uuid);
create or replace function public.delete_cabinet_contrat(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cabinet_id uuid;
  v_shared_by uuid;
begin
  select cabinet_id, shared_by into v_cabinet_id, v_shared_by
  from cabinet_contrats where id = p_id limit 1;

  if not found then
    raise exception 'Contrat not found';
  end if;

  if v_shared_by = auth.uid() or public.is_cabinet_owner(v_cabinet_id, auth.uid()) then
    delete from cabinet_contrats where id = p_id;
  else
    raise exception 'Unauthorized to delete this contrat';
  end if;
end;
$$;

-- Partager un dossier existant au cabinet
-- share_dossier_to_cabinet disabled: replaced with explicit exception to prevent sharing.
drop function if exists public.share_dossier_to_cabinet(uuid, uuid, text, text);
create or replace function public.share_dossier_to_cabinet(
  cabinet_id_param uuid,
  dossier_id_param uuid,
  title_param text,
  description_param text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Sharing disabled: share_dossier_to_cabinet has been removed.';
end;
$$;

-- Partager un contrat existant au cabinet
-- share_contrat_to_cabinet disabled: replaced with explicit exception to prevent sharing.
drop function if exists public.share_contrat_to_cabinet(uuid, uuid, text, text);
create or replace function public.share_contrat_to_cabinet(
  cabinet_id_param uuid,
  contrat_id_param uuid,
  title_param text,
  description_param text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Sharing disabled: share_contrat_to_cabinet has been removed.';
end;
$$;
