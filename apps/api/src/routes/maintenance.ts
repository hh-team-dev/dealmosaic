import { Hono } from 'hono';
import type { AppBindings } from '../middleware/session.js';
import { dailyJobStatus, runDailyNow } from '../services/daily-job.js';
import { mailStatus } from '../lib/mailer.js';

/**
 * MANUAL ENTRY POINT FOR THE DAILY JOB.
 *
 * The job normally schedules itself from the health-check heartbeat (see
 * services/daily-job.ts). This route exists so a human — or a scheduler, if one
 * is ever added — can run it deliberately and read the report:
 *
 *   POST /api/maintenance/daily        run it now
 *   GET  /api/maintenance/daily        when did it last run, and did it work?
 *
 * Both are token-guarded: the job writes prices and sends email.
 */
export const maintenanceRoutes = new Hono<AppBindings>();

function authorised(c: { req: { header: (n: string) => string | undefined } }): boolean {
  const expected = process.env.SYNC_TOKEN;
  const given = c.req.header('x-sync-token');
  return Boolean(expected) && given === expected;
}

maintenanceRoutes.get('/daily', async (c) => {
  if (!authorised(c)) {
    return c.json({ error: { code: 'forbidden', message: 'This endpoint requires a valid token.' } }, 403);
  }
  return c.json({ ok: true, status: await dailyJobStatus(), mailTransport: mailStatus().transport });
});

maintenanceRoutes.post('/daily', async (c) => {
  if (!authorised(c)) {
    return c.json({ error: { code: 'forbidden', message: 'This endpoint requires a valid token.' } }, 403);
  }
  const result = await runDailyNow('manual');
  return c.json({ ...result, mailTransport: mailStatus().transport });
});
