-- Scale & Visibility setup for Cabinets
-- Safe, idempotent SQL to run in Supabase SQL editor.
-- Includes diagnostics, paginated RPC, indexes, backfill and commented safe-fix blocks.

BEGIN;

-- Ensure necessary extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Recreate / ensure RLS policy for cabinet_members (idempotent)
ALTER TABLE IF EXISTS public.cabinet_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cabinet_members_user_access ON public.cabinet_members;
CREATE POLICY cabinet_members_user_access ON public.cabinet_members
  FOR ALL USING (
    -- Owner of the cabinet
    EXISTS (
      SELECT 1 FROM public.cabinets c
      WHERE c.id = cabinet_id AND c.owner_id = auth.uid()
    )
    OR
    -- Active member
    EXISTS (
      SELECT 1 FROM public.cabinet_members cm
      WHERE cm.cabinet_id = cabinet_id AND cm.user_id = auth.uid() AND cm.status = 'active'
    )
    OR
    -- The user's own membership row
    user_id = auth.uid()
    OR
    -- Pending invite matching JWT email
    (
      COALESCE(LOWER((NULLIF(current_setting('request.jwt.claims', true), '')::json ->> 'email')), '') = LOWER(COALESCE(email, ''))
      AND status = 'pending'
    )
  );

-- 2) Composite index to speed cabinet+status queries
CREATE INDEX IF NOT EXISTS idx_cabinet_members_cabinet_status ON public.cabinet_members(cabinet_id, status);

-- 3) Paginated RPC (idempotent)
DROP FUNCTION IF EXISTS public.get_cabinet_members_paginated(uuid, int, int);
CREATE OR REPLACE FUNCTION public.get_cabinet_members_paginated(
  cabinet_id_param uuid,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  cabinet_id uuid,
  user_id uuid,
  email text,
  nom text,
  role_cabinet text,
  status text,
  invitation_sent_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_jwt json := NULLIF(current_setting('request.jwt.claims', true), '')::json;
  v_email text := lower(coalesce(v_jwt ->> 'email', ''));
BEGIN
  -- Owner
  IF EXISTS (
    SELECT 1 FROM cabinets WHERE id = cabinet_id_param AND owner_id = auth.uid()
  ) THEN
    RETURN QUERY
      SELECT cm.id, cm.cabinet_id, cm.user_id, cm.email, cm.nom, cm.role_cabinet,
             cm.status, cm.invitation_sent_at, cm.joined_at, cm.created_at
      FROM cabinet_members cm
      WHERE cm.cabinet_id = cabinet_id_param
      ORDER BY cm.created_at
      LIMIT p_limit OFFSET p_offset;
    RETURN;
  END IF;

  -- Active member
  IF EXISTS (
    SELECT 1 FROM cabinet_members
    WHERE cabinet_id = cabinet_id_param AND user_id = auth.uid() AND status = 'active'
  ) THEN
    RETURN QUERY
      SELECT cm.id, cm.cabinet_id, cm.user_id, cm.email, cm.nom, cm.role_cabinet,
             cm.status, cm.invitation_sent_at, cm.joined_at, cm.created_at
      FROM cabinet_members cm
      WHERE cm.cabinet_id = cabinet_id_param
      ORDER BY cm.created_at
      LIMIT p_limit OFFSET p_offset;
    RETURN;
  END IF;

  -- Pending invite by email
  IF v_email IS NOT NULL AND v_email <> '' THEN
    IF EXISTS (
      SELECT 1 FROM cabinet_members cm
      WHERE cm.cabinet_id = cabinet_id_param AND cm.status = 'pending' AND lower(cm.email) = v_email
    ) THEN
      RETURN QUERY
        SELECT cm.id, cm.cabinet_id, cm.user_id, cm.email, cm.nom, cm.role_cabinet,
               cm.status, cm.invitation_sent_at, cm.joined_at, cm.created_at
        FROM cabinet_members cm
        WHERE cm.cabinet_id = cabinet_id_param
          AND (
            cm.status = 'active'
            OR (cm.status = 'pending' AND lower(cm.email) = v_email)
          )
        ORDER BY cm.created_at
        LIMIT p_limit OFFSET p_offset;
      RETURN;
    END IF;
  END IF;

  -- Otherwise no rows
  RETURN;
END;
$$;

-- 4) Backfill owners as active members (idempotent insert-on-conflict already exists in main file but include safe block)
-- This will ensure every cabinet owner has an active 'Fondateur' membership.
INSERT INTO public.cabinet_members (cabinet_id, user_id, email, nom, role_cabinet, status, joined_at)
SELECT c.id,
       c.owner_id,
       COALESCE(u.email, c.email) AS email,
       COALESCE(NULLIF(TRIM(p.first_name || ' ' || p.last_name), ''), u.email, c.email) AS nom,
       'Fondateur',
       'active',
       now()
FROM public.cabinets c
LEFT JOIN auth.users u ON u.id = c.owner_id
LEFT JOIN public.profiles p ON p.id = c.owner_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.cabinet_members cm
  WHERE cm.cabinet_id = c.id AND cm.user_id = c.owner_id
)
ON CONFLICT (cabinet_id, user_id) DO NOTHING;

-- 5) Diagnostics (run these to inspect before making destructive changes) ----------------
-- Count per status
-- SELECT status, count(*) FROM public.cabinet_members GROUP BY status ORDER BY count DESC;

-- Cabinets with zero active members
-- SELECT c.id, c.nom FROM public.cabinets c
-- LEFT JOIN public.cabinet_members cm ON cm.cabinet_id = c.id AND cm.status = 'active'
-- GROUP BY c.id HAVING COUNT(cm.*) = 0;

-- Duplicate emails in same cabinet
-- SELECT cabinet_id, lower(email) AS email, count(*) FROM public.cabinet_members GROUP BY cabinet_id, lower(email) HAVING count(*) > 1;

-- 6) Safe-fix templates (commented): review SELECTs above before running these.

-- 6a) Mark rows with a linked user_id as 'active' (use only after manual review)
-- BEGIN;
-- UPDATE public.cabinet_members
-- SET status = 'active'
-- WHERE user_id IS NOT NULL AND status <> 'active';
-- COMMIT;

-- 6b) Deduplicate by keeping the earliest created row per (cabinet_id, lower(email)) and moving others to a backup table
-- -- Create backup table first (one-time)
-- CREATE TABLE IF NOT EXISTS public.cabinet_members_backup AS TABLE public.cabinet_members WITH NO DATA;
-- -- Copy duplicates to backup (dry-run: view rows first using SELECT above)
-- INSERT INTO public.cabinet_members_backup
-- SELECT * FROM public.cabinet_members cm
-- WHERE (cm.cabinet_id, lower(cm.email)) IN (
--   SELECT cabinet_id, lower(email) FROM public.cabinet_members GROUP BY cabinet_id, lower(email) HAVING COUNT(*) > 1
-- )
-- AND cm.id NOT IN (
--   SELECT MIN(id) FROM public.cabinet_members GROUP BY cabinet_id, lower(email)
-- );
-- -- After verifying backup, delete duplicates (example)
-- -- DELETE FROM public.cabinet_members cm
-- -- WHERE (cm.cabinet_id, lower(cm.email)) IN (
-- --   SELECT cabinet_id, lower(email) FROM public.cabinet_members GROUP BY cabinet_id, lower(email) HAVING COUNT(*) > 1
-- -- )
-- -- AND cm.id NOT IN (
-- --   SELECT MIN(id) FROM public.cabinet_members GROUP BY cabinet_id, lower(email)
-- -- );

-- 7) Ensure unique index for pending invites exists (prevents duplicate pending by email)
CREATE UNIQUE INDEX IF NOT EXISTS cabinet_members_pending_unique ON public.cabinet_members(cabinet_id, lower(email)) WHERE status = 'pending';

COMMIT;

-- End of script

-- Instructions:
-- 1) Open Supabase Project → SQL Editor. Paste & run this script.
-- 2) Inspect outputs of the commented SELECT diagnostics before running any UPDATE/DELETE blocks.
-- 3) If you want, I can provide the exact UPDATE/DELETE commands to run after you paste the diagnostics outputs here.
