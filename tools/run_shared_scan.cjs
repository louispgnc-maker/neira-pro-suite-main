#!/usr/bin/env node
// Connects to Postgres using PG_CONN env var and runs the SQL in tools/run_shared_scan.sql
const fs = require('fs');
const { Client } = require('pg');

const conn = process.env.PG_CONN;
if (!conn) {
  console.error('Please set PG_CONN env var to the Postgres connection string');
  process.exit(1);
}

const sqlPath = 'tools/run_shared_scan.sql';
if (!fs.existsSync(sqlPath)) {
  console.error('SQL file not found:', sqlPath);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

(async () => {
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    // Execute the SQL file; the last statement SELECT will return rows
    const res = await client.query(sql);
    // res contains command and rows for the last statement
    if (!res || !res.rows) {
      console.log('No rows returned');
      await client.end();
      return;
    }
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
  } catch (e) {
    console.error('Query error:', e.stack || e.message || e);
    try { await client.end(); } catch (_) {}
    process.exit(1);
  }
})();
