-- Fix cabinet_contrats table structure
-- Drop and recreate with correct columns

-- 1) Drop the existing table
drop table if exists public.cabinet_contrats cascade;

-- 2) Recreate with correct structure
create table public.cabinet_contrats (
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

-- 3) Create indexes
create index cabinet_contrats_cabinet_idx on public.cabinet_contrats(cabinet_id);
create index cabinet_contrats_shared_by_idx on public.cabinet_contrats(shared_by);

-- 4) Enable RLS
alter table public.cabinet_contrats enable row level security;

-- 5) Create RLS policies
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

drop policy if exists "cabinet_members_update_contrats" on public.cabinet_contrats;
create policy "cabinet_members_update_contrats" on public.cabinet_contrats
  for update using (
    cabinet_id in (
      select cm.cabinet_id from cabinet_members cm
      where cm.user_id = auth.uid() and cm.status = 'active'
    )
  );

drop policy if exists "cabinet_members_delete_contrats" on public.cabinet_contrats;
create policy "cabinet_members_delete_contrats" on public.cabinet_contrats
  for delete using (
    cabinet_id in (
      select cm.cabinet_id from cabinet_members cm
      where cm.user_id = auth.uid() and cm.status = 'active'
    )
  );
