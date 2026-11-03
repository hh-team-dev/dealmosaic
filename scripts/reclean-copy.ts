#!/usr/bin/env -S npx tsx
/**
 * RE-CLEAN THE COPY THAT IS ALREADY IN THE DATABASE.
 *
 * Why a separate script exists: `POST /api/coupons/sync` rewrites every row the
 * feed *currently returns*, which fixed 1,103 of 1,105 rows on 3 November 2026 and
 * left two behind — offers that had dropped out of the feed but were still live on
 * the site, still printing `Rs. 67,399!Applicable on the entire…` on a card.
 *
 * Those rows are not in the sync window, so no amount of re-syncing reaches them.
 * This walks the table instead and re-runs the same functions the ingest path uses,
 * in place. It imports `apps/api/src/lib/text.ts` directly rather than reimplementing
 * the rules — a second copy of the cleaning logic is exactly how the two drift.
 *
 * It never writes to a row whose value would not change, so it is safe to run as
 * often as you like and reports how many rows it touched.
 *
 * Usage:
 *   npx tsx scripts/reclean-copy.ts            # report only
 *   npx tsx scripts/reclean-copy.ts --apply    # write the changes
 *
 * Requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the environment.
 */
import { createClient } from '@libsql/client';
import { cleanCopy, prettyTitle } from '../apps/api/src/lib/text.js';

const APPLY = process.argv.includes('--apply');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set.');
  process.exit(1);
}

const db = createClient({ url, authToken });

interface Row {
  id: string;
  title: string | null;
  description: string | null;
  terms: string | null;
}

async function main(): Promise<void> {
  const res = await db.execute('SELECT id, title, description, terms FROM coupons');
  const rows = res.rows as unknown as Row[];
  console.log(`${rows.length} coupon rows`);

  const updates: Array<{ id: string; title: string | null; description: string | null; terms: string | null; why: string[] }> = [];

  for (const row of rows) {
    const title = prettyTitle(row.title, 200) ?? 'Untitled offer';
    const description = cleanCopy(row.description, 400);
    const terms = cleanCopy(row.terms, 400);
    const why: string[] = [];
    if (title !== (row.title ?? '')) why.push('title');
    if (description !== (row.description ?? null)) why.push('description');
    if (terms !== (row.terms ?? null)) why.push('terms');
    if (why.length) updates.push({ id: row.id, title, description, terms, why });
  }

  console.log(`${updates.length} rows would change`);

  /** One concrete before/after, so the output proves what it did rather than asserting it. */
  const sample = updates.find((u) => u.why.includes('description'));
  if (sample) {
    const before = rows.find((r) => r.id === sample.id)?.description ?? '';
    console.log('before:', before.slice(0, 160));
    console.log('after :', (sample.description ?? '').slice(0, 160));
  }

  if (!APPLY) {
    console.log('Report only. Re-run with --apply to write.');
    process.exit(0);
  }

  let written = 0;
  for (let i = 0; i < updates.length; i += 50) {
    const chunk = updates.slice(i, i + 50);
    await db.batch(
      chunk.map((u) => ({
        sql: 'UPDATE coupons SET title = ?, description = ?, terms = ? WHERE id = ?',
        args: [u.title, u.description, u.terms, u.id],
      })),
      'write',
    );
    written += chunk.length;
    process.stdout.write(`\r${written}/${updates.length} written`);
  }
  console.log(`\nDone — ${written} rows rewritten through the same functions as ingest.`);
}

main().catch((err: unknown) => {
  console.error((err as Error).message);
  process.exit(1);
});
