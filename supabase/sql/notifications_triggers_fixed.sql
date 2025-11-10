-- Notifications table + triggers (fixed dollar-quoting)
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
returns trigger language plpgsql security definer as $function$
declare
  v_owner uuid := NEW.owner_id;
  v_doc_name text := coalesce(NEW.name, 'Document');
  v_actor_name text;
  v_cabinet_id uuid;
  v_cabinet_name text;
  v_rec record;
begin
  -- get actor name and cabinet (fallback to auth.users.email if profile.email missing)
    select coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), u.email) into v_actor_name
    from public.profiles p
    left join auth.users u on u.id = v_owner
    where p.id = v_owner
    limit 1;
  select p.cabinet_id into v_cabinet_id from public.profiles p where p.id = v_owner limit 1;
  if v_cabinet_id is null then
    -- nothing to notify
    return null;
  end if;
  select nom into v_cabinet_name from public.cabinets c where c.id = v_cabinet_id limit 1;

  for v_rec in
    select cm.user_id from public.cabinet_members cm
    where cm.cabinet_id = v_cabinet_id and cm.status = 'active' and cm.user_id is not null and cm.user_id <> v_owner
  loop
    insert into public.notifications (recipient_id, actor_id, cabinet_id, title, body, metadata)
    values (
      v_rec.user_id,
      v_owner,
      v_cabinet_id,
      format('%s vient d''ajouter "%s" à l''espace collaboratif du "%s"', v_actor_name, v_doc_name, coalesce(v_cabinet_name, 'cabinet')),
      null,
      json_build_object('type', 'document', 'id', NEW.id::text)::jsonb
    );
  end loop;
  return null;
end;
$function$;

drop trigger if exists trigger_notify_document_insert on public.documents;
create trigger trigger_notify_document_insert
after insert on public.documents
for each row execute procedure public.notify_on_document_insert();

-- Function: notify when a client record is created
create or replace function public.notify_on_client_insert()
returns trigger language plpgsql security definer as $function$
declare
  v_owner uuid := NEW.owner_id;
  v_client_name text := coalesce(NEW.prenom || ' ' || NEW.nom, NEW.name, 'Client');
  v_actor_name text;
  v_cabinet_id uuid;
  v_cabinet_name text;
  v_rec record;
begin
  select coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), u.email) into v_actor_name
    from public.profiles p
    left join auth.users u on u.id = v_owner
    where p.id = v_owner
    limit 1;
  select p.cabinet_id into v_cabinet_id from public.profiles p where p.id = v_owner limit 1;
  if v_cabinet_id is null then return null; end if;
  select nom into v_cabinet_name from public.cabinets c where c.id = v_cabinet_id limit 1;

  for v_rec in
    select cm.user_id from public.cabinet_members cm
    where cm.cabinet_id = v_cabinet_id and cm.status = 'active' and cm.user_id is not null and cm.user_id <> v_owner
  loop
    insert into public.notifications (recipient_id, actor_id, cabinet_id, title, body, metadata)
    values (
      v_rec.user_id,
      v_owner,
      v_cabinet_id,
      format('%s vient d''ajouter une fiche client "%s" à l''espace collaboratif du "%s"', v_actor_name, v_client_name, coalesce(v_cabinet_name, 'cabinet')),
      null,
      json_build_object('type', 'client', 'id', NEW.id::text)::jsonb
    );
  end loop;
  return null;
end;
$function$;

drop trigger if exists trigger_notify_client_insert on public.clients;
create trigger trigger_notify_client_insert
after insert on public.clients
for each row execute procedure public.notify_on_client_insert();

-- Function: notify when a signature is completed
create or replace function public.notify_on_signature_update()
returns trigger language plpgsql security definer as $function$
declare
  v_owner uuid := NEW.owner_id;
  v_actor_name text;
  v_cabinet_id uuid;
  v_cabinet_name text;
  v_rec record;
begin
  if NEW.status = old.status then return null; end if;
  if NEW.status is distinct from 'completed' then return null; end if;

  select coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), u.email) into v_actor_name
    from public.profiles p
    left join auth.users u on u.id = v_owner
    where p.id = v_owner
    limit 1;
  select p.cabinet_id into v_cabinet_id from public.profiles p where p.id = v_owner limit 1;
  if v_cabinet_id is null then return null; end if;
  select nom into v_cabinet_name from public.cabinets c where c.id = v_cabinet_id limit 1;

  for v_rec in
    select cm.user_id from public.cabinet_members cm
    where cm.cabinet_id = v_cabinet_id and cm.status = 'active' and cm.user_id is not null and cm.user_id <> v_owner
  loop
    insert into public.notifications (recipient_id, actor_id, cabinet_id, title, body, metadata)
    values (
      v_rec.user_id,
      v_owner,
      v_cabinet_id,
      format('%s vient de signer "%s" dans l''espace collaboratif du "%s"', v_actor_name, coalesce(NEW.document_name, 'Document'), coalesce(v_cabinet_name, 'cabinet')),
      null,
      json_build_object('type', 'signature', 'id', NEW.id::text)::jsonb
    );
  end loop;
  return null;
end;
$function$;

drop trigger if exists trigger_notify_signature_update on public.signatures;
create trigger trigger_notify_signature_update
after update on public.signatures
for each row execute procedure public.notify_on_signature_update();

-- Function: notify when a new cabinet member becomes active (joins)
create or replace function public.notify_on_cabinet_member_insert()
returns trigger language plpgsql security definer as $function$
declare
  v_cabinet_id uuid := NEW.cabinet_id;
  v_user_id uuid := NEW.user_id;
  v_actor_name text;
  v_cabinet_name text;
  v_rec record;
begin
  if NEW.status != 'active' then return null; end if;
  if v_user_id is null then return null; end if;
  select coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), u.email) into v_actor_name
    from public.profiles p
    left join auth.users u on u.id = v_user_id
    where p.id = v_user_id
    limit 1;
  select nom into v_cabinet_name from public.cabinets c where c.id = v_cabinet_id limit 1;

  for v_rec in
    select cm.user_id from public.cabinet_members cm
    where cm.cabinet_id = v_cabinet_id and cm.status = 'active' and cm.user_id is not null and cm.user_id <> v_user_id
  loop
    insert into public.notifications (recipient_id, actor_id, cabinet_id, title, body, metadata)
    values (
      v_rec.user_id,
      v_user_id,
      v_cabinet_id,
      format('%s vient de rejoindre l''espace collaboratif du "%s"', v_actor_name, coalesce(v_cabinet_name, 'cabinet')),
      null,
      json_build_object('type', 'member_join', 'id', NEW.id::text)::jsonb
    );
  end loop;
  return null;
end;
$function$;

drop trigger if exists trigger_notify_cabinet_member_insert on public.cabinet_members;
create trigger trigger_notify_cabinet_member_insert
after insert on public.cabinet_members
for each row execute procedure public.notify_on_cabinet_member_insert();

-- Done

-- Indexes to speed up recipient lookups and unread count
create index if not exists notifications_recipient_idx on public.notifications(recipient_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);
create index if not exists notifications_unread_partial_idx on public.notifications(recipient_id) where read = false;

-- Allow recipients to update their notifications (mark as read)
drop policy if exists "notifications_update_recipient" on public.notifications;
create policy "notifications_update_recipient" on public.notifications
  for update using (recipient_id = auth.uid());

-- RPC: get unread notifications count for current user
drop function if exists public.get_unread_notifications_count();
create function public.get_unread_notifications_count()
returns integer language sql stable as $function$
  select count(*)::int from public.notifications where recipient_id = auth.uid() and read = false;
$function$;

-- RPC: get notifications list (paged)
drop function if exists public.get_notifications(integer, integer);
create function public.get_notifications(p_limit integer default 20, p_offset integer default 0)
returns setof public.notifications language sql stable as $function$
  select * from public.notifications
  where recipient_id = auth.uid()
  order by created_at desc
  limit coalesce(p_limit,20) offset coalesce(p_offset,0);
$function$;

-- RPC: mark a single notification as read
drop function if exists public.mark_notification_read(uuid);
create function public.mark_notification_read(p_id uuid)
returns void language plpgsql security definer as $function$
begin
  update public.notifications set read = true where id = p_id and recipient_id = auth.uid();
  return;
end;
$function$;

-- RPC: mark all notifications as read for current user; returns number marked
drop function if exists public.mark_all_notifications_read();
create function public.mark_all_notifications_read()
returns integer language plpgsql security definer as $function$
declare
  v_count integer := 0;
begin
  -- Try to compute count first; if a SELECT ... INTO elsewhere raises P0003 during
  -- the function execution, fallback to performing the update and reading ROW_COUNT.
  begin
    select count(*)::int into v_count from public.notifications where recipient_id = auth.uid() and read = false;
  exception when sqlstate 'P0003' then
    -- If some nested SELECT caused P0003, perform update and return affected rows.
    update public.notifications set read = true where recipient_id = auth.uid() and read = false;
    get diagnostics v_count = row_count;
    return v_count;
  end;

  if v_count = 0 then
    return 0;
  end if;

  update public.notifications set read = true where recipient_id = auth.uid() and read = false;
  return v_count;
end;
$function$;

-- Notify when a cabinet_dossiers row is inserted (share to cabinet)
create or replace function public.notify_on_cabinet_dossier_insert()
returns trigger language plpgsql security definer as $function$
declare
  v_actor uuid := NEW.shared_by;
  v_dossier_title text := coalesce(NEW.title, 'Dossier');
  v_actor_name text;
  v_cabinet_id uuid := NEW.cabinet_id;
  v_cabinet_name text;
  v_rec record;
begin
  if v_cabinet_id is null then
    return null;
  end if;

  select coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), u.email) into v_actor_name
    from public.profiles p
    left join auth.users u on u.id = v_actor
    where p.id = v_actor
    limit 1;

  select nom into v_cabinet_name from public.cabinets c where c.id = v_cabinet_id limit 1;

  for v_rec in
    select cm.user_id from public.cabinet_members cm
    where cm.cabinet_id = v_cabinet_id and cm.status = 'active' and cm.user_id is not null and cm.user_id <> v_actor
  loop
    insert into public.notifications (recipient_id, actor_id, cabinet_id, title, body, metadata)
    values (
      v_rec.user_id,
      v_actor,
      v_cabinet_id,
      format('%s vient de partager le dossier "%s" dans l''espace collaboratif du "%s"', v_actor_name, v_dossier_title, coalesce(v_cabinet_name, 'cabinet')),
      null,
      json_build_object('type', 'cabinet_dossier', 'id', NEW.id::text, 'dossier_id', coalesce(NEW.dossier_id::text, '') )::jsonb
    );
  end loop;

  return null;
end;
$function$;

drop trigger if exists trigger_notify_cabinet_dossier_insert on public.cabinet_dossiers;
create trigger trigger_notify_cabinet_dossier_insert
after insert on public.cabinet_dossiers
for each row execute procedure public.notify_on_cabinet_dossier_insert();

-- Notify when a cabinet_contrats row is inserted (share to cabinet)
create or replace function public.notify_on_cabinet_contrat_insert()
returns trigger language plpgsql security definer as $function$
declare
  v_actor uuid := NEW.shared_by;
  v_title text := coalesce(NEW.title, 'Contrat');
  v_actor_name text;
  v_cabinet_id uuid := NEW.cabinet_id;
  v_cabinet_name text;
  v_rec record;
begin
  if v_cabinet_id is null then
    return null;
  end if;

  select coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), u.email) into v_actor_name
    from public.profiles p
    left join auth.users u on u.id = v_actor
    where p.id = v_actor
    limit 1;

  select nom into v_cabinet_name from public.cabinets c where c.id = v_cabinet_id limit 1;

  for v_rec in
    select cm.user_id from public.cabinet_members cm
    where cm.cabinet_id = v_cabinet_id and cm.status = 'active' and cm.user_id is not null and cm.user_id <> v_actor
  loop
    insert into public.notifications (recipient_id, actor_id, cabinet_id, title, body, metadata)
    values (
      v_rec.user_id,
      v_actor,
      v_cabinet_id,
      format('%s vient de partager le contrat "%s" dans l''espace collaboratif du "%s"', v_actor_name, v_title, coalesce(v_cabinet_name, 'cabinet')),
      null,
      json_build_object('type', 'cabinet_contrat', 'id', NEW.id::text, 'contrat_id', coalesce(NEW.contrat_id::text, '') )::jsonb
    );
  end loop;

  return null;
end;
$function$;

drop trigger if exists trigger_notify_cabinet_contrat_insert on public.cabinet_contrats;
create trigger trigger_notify_cabinet_contrat_insert
after insert on public.cabinet_contrats
for each row execute procedure public.notify_on_cabinet_contrat_insert();

-- Notify when a cabinet_documents row is inserted (share to cabinet)
create or replace function public.notify_on_cabinet_document_insert()
returns trigger language plpgsql security definer as $function$
declare
  v_actor uuid := NEW.shared_by;
  v_title text := coalesce(NEW.title, NEW.file_name, 'Document');
  v_actor_name text;
  v_cabinet_id uuid := NEW.cabinet_id;
  v_cabinet_name text;
  v_rec record;
begin
  if v_cabinet_id is null then
    return null;
  end if;

  select coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), u.email) into v_actor_name
    from public.profiles p
    left join auth.users u on u.id = v_actor
    where p.id = v_actor
    limit 1;

  select nom into v_cabinet_name from public.cabinets c where c.id = v_cabinet_id limit 1;

  for v_rec in
    select cm.user_id from public.cabinet_members cm
    where cm.cabinet_id = v_cabinet_id and cm.status = 'active' and cm.user_id is not null and cm.user_id <> v_actor
  loop
    insert into public.notifications (recipient_id, actor_id, cabinet_id, title, body, metadata)
    values (
      v_rec.user_id,
      v_actor,
      v_cabinet_id,
      format('%s vient de partager le document "%s" dans l''espace collaboratif du "%s"', v_actor_name, v_title, coalesce(v_cabinet_name, 'cabinet')),
      null,
      json_build_object('type', 'cabinet_document', 'id', NEW.id::text, 'document_id', coalesce(NEW.document_id::text, '') )::jsonb
    );
  end loop;

  return null;
end;
$function$;

drop trigger if exists trigger_notify_cabinet_document_insert on public.cabinet_documents;
create trigger trigger_notify_cabinet_document_insert
after insert on public.cabinet_documents
for each row execute procedure public.notify_on_cabinet_document_insert();

-- Notify when a task is created (collaborative tasks)
create or replace function public.notify_on_task_insert()
returns trigger language plpgsql security definer as $function$
declare
  v_actor uuid := NEW.owner_id;
  v_title text := coalesce(NEW.title, 'Tâche');
  v_actor_name text;
  v_cabinet_id uuid;
  v_cabinet_name text;
  v_rec record;
begin
  -- determine cabinet from actor profile
  select p.cabinet_id into v_cabinet_id from public.profiles p where p.id = v_actor limit 1;
  if v_cabinet_id is null then return null; end if;

  select coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), u.email) into v_actor_name
    from public.profiles p
    left join auth.users u on u.id = v_actor
    where p.id = v_actor
    limit 1;
  select nom into v_cabinet_name from public.cabinets c where c.id = v_cabinet_id limit 1;

  for v_rec in
    select cm.user_id from public.cabinet_members cm
    join public.profiles pr on pr.id = cm.user_id
    where cm.cabinet_id = v_cabinet_id and cm.status = 'active' and cm.user_id is not null and cm.user_id <> v_actor
      and pr.role = NEW.role
  loop
    insert into public.notifications (recipient_id, actor_id, cabinet_id, title, body, metadata)
    values (
      v_rec.user_id,
      v_actor,
      v_cabinet_id,
      format('%s vient de créer la tâche "%s" pour %s dans l''espace collaboratif du "%s"', v_actor_name, v_title, NEW.role, coalesce(v_cabinet_name, 'cabinet')),
      null,
      json_build_object('type', 'task', 'id', NEW.id::text)::jsonb
    );
  end loop;

  return null;
end;
$function$;

drop trigger if exists trigger_notify_task_insert on public.tasks;
create trigger trigger_notify_task_insert
after insert on public.tasks
for each row execute procedure public.notify_on_task_insert();
