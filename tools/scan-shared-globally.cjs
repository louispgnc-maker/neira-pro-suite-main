#!/usr/bin/env node
// Scan common tables/columns for references to shared buckets
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const candidates = [
  { table: 'cabinet_documents', cols: ['file_url', 'file_name'] },
  { table: 'documents', cols: ['storage_path', 'public_url', 'file_url'] },
  { table: 'cabinet_clients', cols: ['file_url'] },
  { table: 'clients', cols: ['file_url'] },
  { table: 'dossiers', cols: ['file_url'] },
  { table: 'contrats', cols: ['file_url'] },
  { table: 'profiles', cols: ['avatar_url', 'photo_url'] },
  { table: 'cabinet_members', cols: ['avatar_url'] },
];

const patterns = ['%shared-documents/%', '%shared_documents/%'];

async function checkTableCol(table, col) {
  try {
    let query = supabase.from(table).select('id, ' + col).limit(1000);
    // build or condition for ilike on column
    const orConditions = patterns.map(p => `${col}.ilike.${p}`).join(',');
    query = query.or(orConditions);
    const { data, error } = await query;
    if (error) {
      // likely column not found or table not found
      // console.debug(`skip ${table}.${col}:`, error.message || error);
      return [];
    }
    if (!data || data.length === 0) return [];
    return data.map(r => ({ table, col, id: r.id, value: r[col] }));
  } catch (e) {
    // ignore per-table errors
    return [];
  }
}

async function main() {
  const results = [];
  for (const c of candidates) {
    for (const col of c.cols) {
      const rows = await checkTableCol(c.table, col);
      results.push(...rows);
    }
  }

  if (results.length === 0) {
    console.log('No occurrences found for shared-documents/shared_documents in scanned tables/columns.');
    return;
  }

  console.log(`Found ${results.length} occurrences:`);
  for (const r of results) {
    console.log('---');
    console.log('table:', r.table);
    console.log('column:', r.col);
    console.log('id:', r.id);
    console.log('value:', r.value);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
