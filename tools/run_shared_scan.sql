-- Exhaustive read-only scan for shared-documents/shared_documents
-- Creates a temp table tmp_shared_scan and inserts matches (LIMIT 1000 per column)
CREATE TEMP TABLE IF NOT EXISTS tmp_shared_scan (
  table_name text,
  column_name text,
  row_id text,
  value_text text
);

DO $$
DECLARE
  r RECORD;
  sql TEXT;
BEGIN
  -- empty temp table for this session
  DELETE FROM tmp_shared_scan;

  FOR r IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('character varying','text','json','jsonb')
  LOOP
    sql := format(
      'INSERT INTO tmp_shared_scan (table_name, column_name, row_id, value_text)\n' ||
      'SELECT %L, %L, COALESCE(id::text, ''<no-id>''), left(%I::text, 2000) FROM %I\n' ||
      'WHERE %I::text ILIKE ''%%shared-documents/%%'' OR %I::text ILIKE ''%%shared_documents/%%'' LIMIT 1000',
      r.table_name, r.column_name, r.column_name, r.table_name, r.column_name, r.column_name
    );
    BEGIN
      EXECUTE sql;
    EXCEPTION WHEN others THEN
      -- ignore per-table/column errors (permissions, casting, etc.)
      RAISE NOTICE 'skip %.: %', r.table_name, SQLERRM;
    END;
  END LOOP;
END$$;

-- Return results
SELECT * FROM tmp_shared_scan ORDER BY table_name, column_name LIMIT 10000;
