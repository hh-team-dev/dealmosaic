#!/usr/bin/env node
/**
 * Database snapshot & restore verification.
 *
 * Why this exists: the project's code is backed up, but *data* was not. The
 * catalogue, platform registry and price history are real work product and
 * deserve the same treatment.
 *
 * THE CRITICAL CONSTRAINT: the GitHub repository is PUBLIC. A naive `mysqldump`
 * of this database would publish every user's email address and password hash.
 * So this script divides the schema in two and treats them differently:
 *
 *   • PUBLIC tables (allow-list)  → written to `db-snapshots/`, committed to git.
 *     These contain no personal data: catalogue, offers, price history,
 *     reference data. Safe to publish.
 *
 *   • PRIVATE tables              → written OUTSIDE the repository, to
 *     ~/.config/dealmosaic/db/. Never committed, never archived.
 *
 * The public list is an ALLOW-list rather than a deny-list on purpose: if a new
 * personal table is added later and nobody updates this file, it is excluded by
 * default. A deny-list would silently leak it.
 *
 * Usage:
 *   node scripts/db-backup.mjs                 # public snapshot → db-snapshots/
 *   node scripts/db-backup.mjs --private       # personal tables → ~/.config
 *   node scripts/db-backup.mjs --verify FILE   # restore into a scratch DB and compare
 */
import { createClient } from '@libsql/client';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT_DIR = join(ROOT, 'db-snapshots');
const PRIVATE_DIR = join(homedir(), '.config', 'dealmosaic', 'db');
const SCHEMA_FILES = [join(ROOT, 'apps/api/src/db/schema.sql'), join(ROOT, 'apps/api/src/db/catalog.sql')];

/**
 * Tables with no personal data. Safe to publish in a public repository.
 * Anything not on this list is treated as private.
 */
const PUBLIC_TABLES = [
  'countries',
  'currencies',
  'platforms',
  'catalogue_products',
  'product_variants',
  'offers',
  'offer_snapshots',
  'exchange_rates',
  'trending_queries', // aggregate search strings, no user link
];

/** Everything that could identify a person. Written outside the repository only. */
const PRIVATE_TABLES = [
  'users',
  'sessions',
  'auth_tokens',
  'auth_events',
  'user_preferences',
  'user_search_history',
  'community_prices',
  'saved_products',
  'price_alerts',
  'notification_events',
  'dev_outbox',
  'product_match_reviews',
];

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valueOf = (f, d = null) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

function makeClient() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const token = process.env.TURSO_AUTH_TOKEN?.trim();
  if (url) return createClient({ url, ...(token ? { authToken: token } : {}) });
  const local = process.env.DB_PATH ?? join(ROOT, 'apps/api/data/dealmosaic.db');
  return createClient({ url: `file:${local}` });
}

/** SQL literal for a JS value coming back from libSQL. */
function lit(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' || typeof v === 'bigint') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (v instanceof Uint8Array) return `X'${Buffer.from(v).toString('hex')}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function tableExists(db, name) {
  const r = await db.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
    args: [name],
  });
  return r.rows.length > 0;
}

async function dumpTables(db, tables) {
  const out = [];
  const counts = {};
  for (const table of tables) {
    if (!(await tableExists(db, table))) continue;
    const r = await db.execute(`SELECT * FROM ${table}`);
    counts[table] = r.rows.length;
    if (r.rows.length === 0) continue;
    const cols = r.columns;
    const colList = cols.join(', ');
    out.push(`\n-- ${table} (${r.rows.length} rows)`);
    for (const row of r.rows) {
      const values = cols.map((c) => lit(row[c]));
      out.push(`INSERT INTO ${table} (${colList}) VALUES (${values.join(', ')});`);
    }
  }
  return { sql: out.join('\n'), counts };
}

function header(kind, counts, source) {
  const rows = Object.entries(counts)
    .map(([t, n]) => `--   ${t}: ${n}`)
    .join('\n');
  return `-- DEALMOSAIC database snapshot (${kind})
--
-- Generated: ${new Date().toISOString()}
-- Source:    ${source}
-- Engine:    SQLite (libSQL / Turso)
--
-- This file contains DATA ONLY. The schema lives in
-- apps/api/src/db/schema.sql and apps/api/src/db/catalog.sql, which are
-- already version-controlled — so a restore is: apply schema, then this file.
--
-- Row counts:
${rows}

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;
`;
}

async function snapshotPublic() {
  const db = makeClient();
  const source = process.env.TURSO_DATABASE_URL?.trim() || 'local file';
  const { sql, counts } = await dumpTables(db, PUBLIC_TABLES);

  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const file = join(SNAPSHOT_DIR, `dealmosaic-public-${stamp}.sql`);
  const body = header('PUBLIC — safe for a public repository', counts, source) + sql + '\nCOMMIT;\nPRAGMA foreign_keys = ON;\n';
  writeFileSync(file, body);

  const sha = createHash('sha256').update(body).digest('hex');
  const manifest = {
    generatedAt: new Date().toISOString(),
    source,
    scope: 'public',
    tables: counts,
    totalRows: Object.values(counts).reduce((a, b) => a + b, 0),
    sha256: sha,
    bytes: Buffer.byteLength(body),
  };
  writeFileSync(join(SNAPSHOT_DIR, 'latest.json'), JSON.stringify(manifest, null, 2) + '\n');

  console.log(`✅ Public snapshot: ${file.replace(ROOT + '/', '')}`);
  for (const [t, n] of Object.entries(counts)) console.log(`   ${t.padEnd(22)} ${n}`);
  console.log(`   sha256 ${sha.slice(0, 16)}…  ${manifest.totalRows} rows  ${(manifest.bytes / 1024).toFixed(1)} KB`);
  console.log(
    '\n   Contains no personal data: users, sessions, auth tokens and search history\n' +
      '   are excluded by allow-list. Safe to commit.',
  );
}

async function snapshotPrivate() {
  const db = makeClient();
  const source = process.env.TURSO_DATABASE_URL?.trim() || 'local file';
  const { sql, counts } = await dumpTables(db, PRIVATE_TABLES);

  mkdirSync(PRIVATE_DIR, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = join(PRIVATE_DIR, `dealmosaic-private-${stamp}.sql`);
  const body = header('PRIVATE — contains personal data, never commit', counts, source) + sql + '\nCOMMIT;\n';
  writeFileSync(file, body, { mode: 0o600 });

  console.log(`✅ Private snapshot: ${file}`);
  for (const [t, n] of Object.entries(counts)) console.log(`   ${t.padEnd(22)} ${n}`);
  console.log('\n   Stored OUTSIDE the repository, mode 0600. Never commit this file.');
  console.log('   It holds real email addresses and password hashes.');
}

async function verify(file) {
  if (!file || !existsSync(file)) {
    console.error(`✗ No such snapshot: ${file}`);
    process.exit(1);
  }

  // Restore into a throwaway in-memory database to prove the dump is loadable.
  const scratch = createClient({ url: ':memory:' });
  for (const schemaFile of SCHEMA_FILES) {
    await scratch.executeMultiple(readFileSync(schemaFile, 'utf8'));
  }
  await scratch.executeMultiple(readFileSync(file, 'utf8'));

  const declared = JSON.parse(readFileSync(join(SNAPSHOT_DIR, 'latest.json'), 'utf8')).tables;
  let ok = true;
  for (const [table, expected] of Object.entries(declared)) {
    const r = await scratch.execute(`SELECT COUNT(*) AS n FROM ${table}`);
    const actual = Number(r.rows[0].n);
    const match = actual === expected;
    if (!match) ok = false;
    console.log(`  ${match ? '✓' : '✗'} ${table.padEnd(22)} expected ${expected}, restored ${actual}`);
  }

  // Prove the restored data is actually usable, not just present.
  const sample = await scratch.execute(
    'SELECT p.title, COUNT(v.id) AS variants FROM catalogue_products p LEFT JOIN product_variants v ON v.product_id = p.id GROUP BY p.id LIMIT 3',
  );
  console.log('\n  Sample query after restore:');
  for (const row of sample.rows) console.log(`    ${row.title} — ${row.variants} variants`);

  if (!ok) {
    console.error('\n✗ Restore verification FAILED — row counts do not match.');
    process.exit(1);
  }
  console.log('\n✅ Restore verified: the snapshot loads cleanly into a fresh database.');
}

const verifyTarget = valueOf('--verify');
if (has('--private')) await snapshotPrivate();
else if (verifyTarget !== null) await verify(args[args.indexOf('--verify') + 1]);
else await snapshotPublic();
