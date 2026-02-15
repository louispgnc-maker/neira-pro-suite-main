#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ VITE_SUPABASE_URL et VITE_SUPABASE_SERVICE_ROLE_KEY requis dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
-- Table de liaison entre client_dossiers_new et contrats
create table if not exists public.client_dossier_contrats (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.client_dossiers_new(id) on delete cascade,
  contrat_id uuid not null references public.contrats(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(dossier_id, contrat_id)
);

-- Enable RLS
alter table public.client_dossier_contrats enable row level security;

-- Policies: accès via les permissions du dossier parent
drop policy if exists "client_dossier_contrats_select" on public.client_dossier_contrats;
create policy "client_dossier_contrats_select" on public.client_dossier_contrats
  for select using (
    exists (
      select 1 from public.client_dossiers_new d
      where d.id = dossier_id
    )
  );

drop policy if exists "client_dossier_contrats_insert" on public.client_dossier_contrats;
create policy "client_dossier_contrats_insert" on public.client_dossier_contrats
  for insert with check (
    exists (
      select 1 from public.client_dossiers_new d
      where d.id = dossier_id
    )
  );

drop policy if exists "client_dossier_contrats_delete" on public.client_dossier_contrats;
create policy "client_dossier_contrats_delete" on public.client_dossier_contrats
  for delete using (
    exists (
      select 1 from public.client_dossiers_new d
      where d.id = dossier_id
    )
  );

-- Indexes pour performance
create index if not exists client_dossier_contrats_dossier_idx on public.client_dossier_contrats(dossier_id);
create index if not exists client_dossier_contrats_contrat_idx on public.client_dossier_contrats(contrat_id);

-- Commentaire
comment on table public.client_dossier_contrats is 'Table de liaison entre les dossiers clients et les contrats';
`;

console.log('🚀 Application de la migration client_dossier_contrats...\n');

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.error('❌ Erreur:', error);
  process.exit(1);
} else {
  console.log('✅ Migration appliquée avec succès !');
  console.log('📋 Table client_dossier_contrats créée avec les policies RLS');
}
