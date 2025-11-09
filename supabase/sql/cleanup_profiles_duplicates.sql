-- Cleanup script for duplicate rows in public.profiles
-- SAFE workflow:
-- 1) Run the diagnostics SELECTs in the SQL editor to inspect duplicates (dry-run)
-- 2) If duplicates exist, this script creates a backup table, copies duplicate rows there,
--    then shows which rows would be deleted (dry-run). If you confirm, run the delete block.

-- IMPORTANT: I cannot run this on your Supabase instance from here. Run these steps
-- in the Supabase SQL Editor (or psql) yourself. Do a project backup first.

-- ========== Diagnostics ==========
-- List ids that appear more than once
select id, count(*) as cnt
from public.profiles
group by id
having count(*) > 1
order by cnt desc;

-- Show duplicate rows (full rows) for manual inspection
select *
from public.profiles p
where p.id in (
  select id from public.profiles group by id having count(*) > 1
)
order by id, created_at nulls last;

-- ========== Prepare backup ==========
-- Create a backup table (if not exists) where duplicate rows will be stored before deletion
create table if not exists public.profiles_duplicates_backup as
select * from public.profiles where false;

-- Insert duplicate rows into backup (only rows that have duplicates)
-- This will add rows to the backup table; run only once.
with dup as (
  select id
  from public.profiles
  group by id
  having count(*) > 1
)
insert into public.profiles_duplicates_backup
select p.*
from public.profiles p
join dup on dup.id = p.id;

-- Verify backup count
select count(*) as backed_up from public.profiles_duplicates_backup;

-- ========== Dry-run: show rows that WOULD BE DELETED ==========
-- Keep the earliest created_at row per id (if created_at exists), otherwise keep the first arbitrary.
with ranked as (
  select p.ctid, p.id,
    row_number() over (partition by p.id order by coalesce(p.created_at, '1970-01-01') asc, p.ctid) as rn
  from public.profiles p
)
select p.*
from public.profiles p
join ranked r on p.ctid = r.ctid
where r.rn > 1
order by p.id;

-- If the dry-run results look good, you can delete the duplicates below.
-- ========== DELETE duplicates (run only when ready) ==========
-- This block will delete all but the first row per id and is wrapped in a transaction.
-- Uncomment and run to perform the deletion.

-- begin;
-- with ranked as (
--   select p.ctid,
--     row_number() over (partition by p.id order by coalesce(p.created_at, '1970-01-01') asc, p.ctid) as rn
--   from public.profiles p
-- )
-- delete from public.profiles p
-- using ranked r
-- where p.ctid = r.ctid and r.rn > 1;
-- commit;

-- After deletion, re-run the diagnostics to confirm no duplicate ids remain:
-- select id, count(*) from public.profiles group by id having count(*) > 1;

-- OPTIONAL: add a unique constraint on profiles.id if appropriate (only after duplicates removed)
-- alter table public.profiles add primary key (id);

-- End of script
