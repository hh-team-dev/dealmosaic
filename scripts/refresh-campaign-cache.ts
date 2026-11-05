/** Explicit owner-authorised cache maintenance only. No app import (which would
 * seed data), daily job, email, offer mutation, application or tracking visit.
 * Run with private environment values; never put credentials on the command line.
 * The deployed API must already have migrated category/country columns. */
import { writeFileSync } from 'node:fs';
import { db, client, isRemote } from '../apps/api/src/db/index.js';
import { syncCampaigns } from '../apps/api/src/services/affiliate-campaigns.js';
async function main() {
  if (process.env.OWNER_CACHE_REFRESH !== '1' || process.env.NODE_ENV !== 'production' || !isRemote) throw new Error('Explicit production cache-refresh authorisation and remote DB required');
  const columns = await db.prepare('PRAGMA table_info(affiliate_campaigns)').all();
  if (!['categories_json','countries_json'].every(name => columns.some(c => c.name === name))) throw new Error('Deploy the metadata migration first');
  const before = await db.prepare('SELECT COUNT(*) AS n FROM outbound_clicks').get();
  const startedAt = new Date().toISOString();
  const result = await syncCampaigns(20);
  const evidence = await db.prepare('SELECT COUNT(*) AS cached, SUM(CASE WHEN categories_json IS NOT NULL AND countries_json IS NOT NULL THEN 1 ELSE 0 END) AS withMetadata, MIN(synced_at) AS oldest, MAX(synced_at) AS newest FROM affiliate_campaigns').get();
  const after = await db.prepare('SELECT COUNT(*) AS n FROM outbound_clicks').get();
  const report = { startedAt, finishedAt: new Date().toISOString(), scope: 'Network campaign GETs and local campaign-cache writes only. No applications, affiliate clicks, email, orders or paid activation. Concurrent organic visits may change click totals.', result, evidence, outboundAttemptsBefore: before?.n, outboundAttemptsAfter: after?.n };
  writeFileSync('docs/source/2026-11-05-click-repair-campaign-refresh.json', JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if (!result.ok) process.exitCode=1;
}
main().catch(() => { console.error('Campaign cache refresh failed; no credentials or upstream response bodies logged.'); process.exitCode=1; }).finally(()=>client.close());
