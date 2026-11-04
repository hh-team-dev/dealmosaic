import { createClient } from '@libsql/client';
import { writeFileSync } from 'node:fs';
async function main() {
  const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });
  const r = await db.execute(
    "SELECT campaign_id, platform_slug, COUNT(*) AS n FROM coupons WHERE campaign_id IS NOT NULL GROUP BY campaign_id, platform_slug ORDER BY n DESC",
  );
  const missing = await db.execute('SELECT COUNT(*) AS n FROM coupons WHERE campaign_id IS NULL');
  console.log('distinct campaigns in our table:', r.rows.length);
  console.log('rows without campaign_id:', missing.rows[0]);
  writeFileSync('/tmp/campaigns.json', JSON.stringify(r.rows));
  console.log(r.rows.slice(0, 10));
}
main();
