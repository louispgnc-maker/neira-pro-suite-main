-- Notifications table + triggers
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id),
  cabinet_id uuid references public.cabinets(id),
  title text not null,
  body text,
  read boolean default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- Allow recipients to select their notifications
drop policy if exists "notifications_select_recipient" on public.notifications;
create policy "notifications_select_recipient" on public.notifications
  for select using (recipient_id = auth.uid());

-- Allow inserts (system triggers will run as security definer functions)
drop policy if exists "notifications_insert_any" on public.notifications;
create policy "notifications_insert_any" on public.notifications
  for insert with check (true);

-- Function: notify cabinet members when a document is added
create or replace function public.notify_on_document_insert()
returns trigger language plpgsql security definer as $$
declare
  v_owner uuid := NEW.owner_id;
  v_doc_name text := coalesce(NEW.name, 'Document');
  v_actor_name text;
  v_cabinet_id uuid;
  v_cabinet_name text;
  v_rec record;
begin
  -- get actor name and cabinet
  select coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), p.email) into v_actor_name
    from public.profiles p where p.id = v_owner;
  select p.cabinet_id into v_cabinet_id from public.profiles p where p.id = v_owner;
  if v_cabinet_id is null then
    -- nothing to notify
    return null;
  end if;
  select nom into v_cabinet_name from public.cabinets c where c.id = v_cabinet_id;

  for v_rec in
    select cm.user_id from public.cabinet_members cm
    where cm.cabinet_id = v_cabinet_id and cm.status = 'active' and cm.user_id is not null and cm.user_id <> v_owner
  loop
    insert into public.notifications (recipient_id, actor_id, cabinet_id, title, body)
    values (
      v_rec.user_id,
      v_owner,
      v_cabinet_id,
      format('%s vient d''ajouter "%s" à l''espace collaboratif du "%s"', v_actor_name, v_doc_name, coalesce(v_cabinet_name, 'cabinet')),
      null
    );
  end loop;
  return null;
end;
$$;

drop trigger if exists trigger_notify_document_insert on public.documents;
create trigger trigger_notify_document_insert
after insert on public.documents
for each row execute procedure public.notify_on_document_insert();

-- Function: notify when a client record is created
create or replace function public.notify_on_client_insert()
returns trigger language plpgsql security definer as $$
declare
  v_owner uuid := NEW.owner_id;
  v_client_name text := coalesce(NEW.prenom || ' ' || NEW.nom, NEW.name, 'Client');
  v_actor_name text;
  v_cabinet_id uuid;
  v_cabinet_name text;
  v_rec record;
begin
  select coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), p.email) into v_actor_name
    from public.profiles p where p.id = v_owner;
  select p.cabinet_id into v_cabinet_id from public.profiles p where p.id = v_owner;
  if v_cabinet_id is null then return null; end if;
  select nom into v_cabinet_name from public.cabinets c where c.id = v_cabinet_id;

  for v_rec in
    select cm.user_id from public.cabinet_members cm
    where cm.cabinet_id = v_cabinet_id and cm.status = 'active' and cm.user_id is not null and cm.user_id <> v_owner
  loop
    insert into public.notifications (recipient_id, actor_id, cabinet_id, title, body)
    values (
      v_rec.user_id,
      v_owner,
      v_cabinet_id,
      format('%s vient d''ajouter une fiche client "%s" à l''espace collaboratif du "%s"', v_actor_name, v_client_name, coalesce(v_cabinet_name, 'cabinet')),
      null
    );
  end loop;
  return null;
end;
$$;

drop trigger if exists trigger_notify_client_insert on public.clients;
create trigger trigger_notify_client_insert
after insert on public.clients
for each row execute procedure public.notify_on_client_insert();

-- Function: notify when a signature is completed
create or replace function public.notify_on_signature_update()
returns trigger language plpgsql security definer as $$
declare
  v_owner uuid := NEW.owner_id;
  v_actor_name text;
  v_cabinet_id uuid;
  v_cabinet_name text;
  v_rec record;
begin
  if NEW.status = old.status then return null; end if;
  if NEW.status is distinct from 'completed' then return null; end if;

  select coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), p.email) into v_actor_name
    from public.profiles p where p.id = v_owner;
  select p.cabinet_id into v_cabinet_id from public.profiles p where p.id = v_owner;
  if v_cabinet_id is null then return null; end if;
  select nom into v_cabinet_name from public.cabinets c where c.id = v_cabinet_id;

  for v_rec in
    select cm.user_id from public.cabinet_members cm
    where cm.cabinet_id = v_cabinet_id and cm.status = 'active' and cm.user_id is not null and cm.user_id <> v_owner
  loop
    insert into public.notifications (recipient_id, actor_id, cabinet_id, title, body)
    values (
      v_rec.user_id,
      v_owner,
      v_cabinet_id,
      format('%s vient de signer "%s" dans l''espace collaboratif du "%s"', v_actor_name, coalesce(NEW.document_name, 'Document'), coalesce(v_cabinet_name, 'cabinet')),
      null
    );
  end loop;
  return null;
end;
$$;

drop trigger if exists trigger_notify_signature_update on public.signatures;
create trigger trigger_notify_signature_update
after update on public.signatures
for each row execute procedure public.notify_on_signature_update();

-- Function: notify when a new cabinet member becomes active (joins)
create or replace function public.notify_on_cabinet_member_insert()
returns trigger language plpgsql security definer as $$
declare
  v_cabinet_id uuid := NEW.cabinet_id;
  v_user_id uuid := NEW.user_id;
  v_actor_name text;
  v_cabinet_name text;
  v_rec record;
begin
  if NEW.status != 'active' then return null; end if;
  if v_user_id is null then return null; end if;
  select coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), p.email) into v_actor_name
    from public.profiles p where p.id = v_user_id;
  select nom into v_cabinet_name from public.cabinets c where c.id = v_cabinet_id;

  for v_rec in
    select cm.user_id from public.cabinet_members cm
    where cm.cabinet_id = v_cabinet_id and cm.status = 'active' and cm.user_id is not null and cm.user_id <> v_user_id
  loop
    insert into public.notifications (recipient_id, actor_id, cabinet_id, title, body)
    values (
      v_rec.user_id,
      v_user_id,
      v_cabinet_id,
      format('%s vient de rejoindre l''espace collaboratif du "%s"', v_actor_name, coalesce(v_cabinet_name, 'cabinet')),
      null
    );
  end loop;
  return null;
end;
$$;

drop trigger if exists trigger_notify_cabinet_member_insert on public.cabinet_members;
create trigger trigger_notify_cabinet_member_insert
after insert on public.cabinet_members
for each row execute procedure public.notify_on_cabinet_member_insert();

-- Done
