import { createClient } from '@libsql/client';
async function main() {
  const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });
  // clear the notified stamp so the next run writes again, and check the outbox
  await db.execute("UPDATE saved_deals SET notified_at = NULL");
  const rows = await db.execute("SELECT id, to_email, subject, created_at, sent_at, send_error FROM dev_outbox ORDER BY created_at DESC LIMIT 3");
  console.log(rows.rows);
}
main();
