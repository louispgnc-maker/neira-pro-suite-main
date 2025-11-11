-- Migration: add physical attached_document_ids column to cabinet_dossiers
-- Date: 2025-11-11

-- Add a jsonb column to hold attached cabinet_documents ids to avoid computed/view issues
alter table if exists public.cabinet_dossiers
  add column if not exists attached_document_ids jsonb default '[]'::jsonb;

-- Ensure column is not null for simpler client logic
-- Backfill: ensure existing rows have an array before enforcing NOT NULL
update public.cabinet_dossiers set attached_document_ids = '[]'::jsonb where attached_document_ids is null;

-- Ensure column is not null for simpler client logic
alter table if exists public.cabinet_dossiers
  alter column attached_document_ids set not null;

-- Optional: create a GIN index for faster containment queries
create index if not exists idx_cabinet_dossiers_attached_ids_gin on public.cabinet_dossiers using gin (attached_document_ids jsonb_path_ops);

/*
Notes:
- This migration creates a physical column that clients can safely select via PostgREST.
- It avoids relying on any computed column/view that was causing 42P17 errors (array_agg misuse).
- After running this, the client-side code that writes created cabinet_documents ids into this column
  (see ShareToCollaborativeDialog) will continue to work.
*/
