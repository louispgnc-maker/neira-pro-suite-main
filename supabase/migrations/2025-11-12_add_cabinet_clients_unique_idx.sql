-- Migration: ensure unique constraint for cabinet_clients (client_id, cabinet_id)
-- Date: 2025-11-12

-- Add a unique constraint so ON CONFLICT (client_id, cabinet_id) works in RPCs
-- Add the unique constraint if missing. Some Postgres versions don't support
-- `ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS`, so use a safe DO-block.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'cabinet_clients_client_cabinet_unique'
      AND t.relname = 'cabinet_clients'
  ) THEN
    EXECUTE 'ALTER TABLE public.cabinet_clients ADD CONSTRAINT cabinet_clients_client_cabinet_unique UNIQUE (client_id, cabinet_id)';
  END IF;
END$$;

-- Also create a unique index to speed up lookups (IF NOT EXISTS is supported for indexes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cabinet_clients_client_cabinet ON public.cabinet_clients(client_id, cabinet_id);
