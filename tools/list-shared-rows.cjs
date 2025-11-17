#!/usr/bin/env node
// List cabinet_documents rows referencing shared buckets
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function main() {
  const query = "%shared-documents/%";
  const query2 = "%shared_documents/%";
  try {
    const { data: rows, error } = await supabase
      .from('cabinet_documents')
      .select('id, cabinet_id, document_id, file_url, file_name')
      .or(`file_url.ilike.${query},file_url.ilike.${query2}`)
      .limit(1000);
    if (error) {
      console.error('Query error', error);
      process.exit(1);
    }

    if (!rows || rows.length === 0) {
      console.log('No rows found referencing shared-documents/shared_documents');
      return;
    }

    console.log(`Found ${rows.length} rows:`);
    for (const r of rows) {
      console.log('---');
      console.log('id:', r.id);
      console.log('cabinet_id:', r.cabinet_id);
      console.log('document_id:', r.document_id);
      console.log('file_name:', r.file_name);
      console.log('file_url:', r.file_url);
    }
  } catch (e) {
    console.error('Unexpected error', e);
    process.exit(2);
  }
}

main();
