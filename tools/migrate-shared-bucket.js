#!/usr/bin/env node
/*
  Safe wrapper to run the repository's migration/backfill scripts that move documents to the
  `shared-documents` bucket and update DB rows. This script defaults to --dry-run and only
  prints the commands it will run. To actually execute, pass --run.

  Usage:
    node tools/migrate-shared-bucket.js --dry-run
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node tools/migrate-shared-bucket.js --run

  Notes:
  - This script does not embed any secrets. You must provide SUPABASE_SERVICE_ROLE_KEY in the
    environment to run migrations.
  - Before running in production: always run a dry-run and inspect the SQL it will execute.
*/

const { spawnSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const doRun = args.includes('--run');
const dryRun = !doRun && !args.includes('--no-dry-run');

function print(msg) { console.log(msg); }

print('\n== migrate-shared-bucket wrapper ==');
print(dryRun ? 'Mode: dry-run (no network operations will be executed). Use --run to execute.' : 'Mode: RUN (will attempt to execute migration scripts, requires SUPABASE variables)');

// Scripts present in the repo that perform migration/backfill
const migrateScript = path.resolve(__dirname, '..', 'supabase', 'scripts', 'migrate_shared_docs.js');
const backfillScript = path.resolve(__dirname, '..', 'supabase', 'scripts', 'backfill_shared_docs.js');

print('\nDetected scripts:');
print(` - migrate: ${migrateScript}`);
print(` - backfill: ${backfillScript}`);

print('\nRecommended steps:');
print(' 1) Run the migrate script in dry-run mode to see which DB rows would be updated:');
print('    SUPABASE_URL=https://<PROJECT>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<KEY> node ' + migrateScript + ' --dry-run');
print(' 2) If satisfied, run the same command without --dry-run (or use --run with this wrapper).');
print(' 3) If files need to be copied to shared bucket, run the backfill script similarly (it may copy storage objects).');

if (dryRun) {
  print('\nDry-run mode: will not execute scripts.');
  process.exit(0);
}

// If here, user passed --run
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  print('\nERROR: SUPABASE_SERVICE_ROLE_KEY is required to run migrations. Aborting.');
  process.exit(2);
}

print('\nRunning migrate script...');
let res = spawnSync('node', [migrateScript], { stdio: 'inherit', env: process.env });
if (res.status !== 0) {
  print('\nmigrate script failed with status ' + res.status + '. Aborting.');
  process.exit(res.status || 1);
}

print('\nRunning backfill script...');
res = spawnSync('node', [backfillScript], { stdio: 'inherit', env: process.env });
if (res.status !== 0) {
  print('\nbackfill script failed with status ' + res.status + '. Aborting.');
  process.exit(res.status || 1);
}

print('\nMigration/backfill completed. Verify objects and DB rows manually.');
process.exit(0);
