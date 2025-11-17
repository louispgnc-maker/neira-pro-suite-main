#!/usr/bin/env node
// Exhaustive scan across information_schema for values containing shared-documents/shared_documents
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node tools/scan-shared-exhaustive.cjs

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const PATTERNS = ['shared-documents/', 'shared_documents/'];
const MAX_PAGE = 1000; // rows per page
const MAX_ROWS_PER_TABLE = 100000; // safety cap per table

function containsPattern(val) {
  if (val === null || val === undefined) return false;
  try {
    const s = typeof val === 'string' ? val : JSON.stringify(val);
    for (const p of PATTERNS) if (s.includes(p)) return true;
    return false;
  } catch (e) {
    return false;
  }
}

async function getColumns() {
  // restrict to public schema
  const q = `select table_name, column_name, data_type from information_schema.columns where table_schema = 'public' and data_type in ('character varying', 'text', 'json', 'jsonb') order by table_name`;
  const { data, error } = await supabase.rpc('sql_query', { query: q }).catch(() => ({ data: null, error: true }));
  // Older supabase setups may not have a helper to run raw SQL via rpc. If rpc fails, attempt selecting from information_schema via from()
  if (error || !data) {
    try {
      const { data: cols, error: e2 } = await supabase.from('information_schema.columns').select('table_name, column_name, data_type').eq('table_schema', 'public').in('data_type', ['character varying', 'text', 'json', 'jsonb']);
      if (e2) throw e2;
      return cols || [];
    } catch (e) {
      console.error('Could not query information_schema via RPC or REST. Falling back to a smaller candidate set. Error:', e?.message || e);
      return null;
    }
  }
  return data;
}

async function scanTable(table, cols) {
  const results = [];
  // prepare select string: include id if exists
  const selectCols = ['id', ...cols].join(',');
  let offset = 0;
  let scanned = 0;
  while (true) {
    try {
      const { data, error } = await supabase.from(table).select(selectCols).range(offset, offset + MAX_PAGE - 1);
      if (error) {
        // table may not expose columns as expected; stop scanning
        // console.debug(`skip ${table}:`, error.message || error);
        break;
      }
      if (!data || data.length === 0) break;
      for (const row of data) {
        for (const col of cols) {
          if (!(col in row)) continue;
          const v = row[col];
          if (containsPattern(v)) {
            results.push({ table, col, id: row.id ?? null, value: v });
          }
        }
      }
      scanned += data.length;
      if (scanned >= MAX_ROWS_PER_TABLE) break;
      offset += data.length;
      if (data.length < MAX_PAGE) break;
    } catch (e) {
      // bail on unexpected errors per table
      // console.error('error scanning', table, e?.message || e);
      break;
    }
  }
  return results;
}

async function main() {
  console.log('Starting exhaustive scan for shared-documents/shared_documents in public schema...');
  // Try to build a list of columns per table. We'll query information_schema.columns via REST if possible.
  // Note: some Supabase projects disallow selecting from information_schema via REST; we handle that gracefully.

  // Try simple REST query to information_schema.columns
  let columnsList = null;
  try {
    const { data, error } = await supabase.from('information_schema.columns').select('table_name, column_name, data_type').eq('table_schema', 'public');
    if (!error && Array.isArray(data)) {
      columnsList = data.filter(c => ['character varying', 'text', 'json', 'jsonb'].includes(c.data_type));
    }
  } catch (e) {
    columnsList = null;
  }

  // If we couldn't fetch info schema, fall back to a safe candidate set (tables commonly used in this project)
  let perTableCols = {};
  if (!columnsList) {
    console.log('Could not read information_schema via REST. Falling back to a candidate table/column list. This is less exhaustive.');
    const candidates = {
      cabinet_documents: ['file_url', 'file_name'],
      documents: ['storage_path', 'public_url', 'file_url'],
      cabinet_clients: ['file_url'],
      clients: ['file_url'],
      dossiers: ['file_url'],
      contrats: ['file_url'],
      profiles: ['avatar_url', 'photo_url'],
      cabinet_members: ['avatar_url'],
    };
    perTableCols = candidates;
  } else {
    for (const c of columnsList) {
      const t = c.table_name;
      const col = c.column_name;
      if (!perTableCols[t]) perTableCols[t] = [];
      if (!perTableCols[t].includes(col)) perTableCols[t].push(col);
    }
  }

  const allResults = [];
  const tables = Object.keys(perTableCols);
  for (const table of tables) {
    const cols = perTableCols[table];
    try {
      process.stdout.write(`Scanning ${table} (${cols.join(', ')}) ... `);
      const res = await scanTable(table, cols);
      console.log(`${res.length} hits`);
      allResults.push(...res);
    } catch (e) {
      console.log('error');
    }
  }

  if (allResults.length === 0) {
    console.log('\nNo occurrences found for shared-documents/shared_documents across scanned tables/columns.');
  } else {
    console.log(`\nFound ${allResults.length} occurrences:`);
    for (const r of allResults) {
      console.log('---');
      console.log('table:', r.table);
      console.log('column:', r.col);
      console.log('id:', r.id);
      try {
        const s = typeof r.value === 'string' ? r.value : JSON.stringify(r.value);
        console.log('value snippet:', s.length > 500 ? s.slice(0, 500) + '…' : s);
      } catch (e) {
        console.log('value: <unserializable>');
      }
    }
  }
}

main().catch(e => { console.error('fatal', e); process.exit(1); });
