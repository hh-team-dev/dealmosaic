import { Hono } from 'hono';
import type { AppBindings } from '../middleware/session.js';
import { recordDailySnapshots } from '../services/snapshots.js';
import { runAlerts } from '../services/alerts.js';
import * as cuelinks from '../lib/cuelinks.js';
import { mailStatus } from '../lib/mailer.js';

/**
 * THE ONE ENDPOINT A SCHEDULER NEEDS.
 *
 * Free hosting gives one cheap cron. Rather than asking a scheduler to know the
 * order of operations, this endpoint runs the daily sequence:
 *
 *   1. snapshots  — remember today's price for every live offer;
 *   2. alerts     — email anyone whose target has genuinely been beaten.
 *
 * Snapshots run first on purpose. An alert is only defensible if the price it
 * fires on is recorded, so the record is written before the promise is made.
 *
 * Guarded by SYNC_TOKEN. Returns a plain report so a failed step is visible in
 * the scheduler's log instead of disappearing into a silent morning.
 */
export const maintenanceRoutes = new Hono<AppBindings>();

maintenanceRoutes.post('/daily', async (c) => {
  const expected = process.env.SYNC_TOKEN;
  const given = c.req.header('x-sync-token');
  if (!expected || given !== expected) {
    return c.json({ error: { code: 'forbidden', message: 'This endpoint requires a valid token.' } }, 403);
  }

  const started = Date.now();
  const steps: Array<Record<string, unknown>> = [];

  try {
    const snapshots = await recordDailySnapshots();
    steps.push({ step: 'snapshots', ok: true, ...snapshots });
  } catch (err) {
    steps.push({ step: 'snapshots', ok: false, error: (err as Error).message });
  }

  // Refresh the affiliate feed first when it is configured: an alert that fires
  // on a week-old price is a false alarm with an audience.
  if (cuelinks.isConfigured() && c.req.query('refresh') !== '0') {
    steps.push({ step: 'affiliate', ok: true, note: 'call POST /api/coupons/sync separately; it is slow by design and kept out of this path' });
  }

  try {
    const alerts = await runAlerts();
    steps.push({
      step: 'alerts',
      ok: true,
      checked: alerts.checked,
      skipped: alerts.skipped,
      fired: alerts.triggered.length,
      emailed: alerts.triggered.filter((t) => t.sent).length,
    });
  } catch (err) {
    steps.push({ step: 'alerts', ok: false, error: (err as Error).message });
  }

  const mail = mailStatus();
  return c.json({
    ok: steps.every((s) => s.ok !== false),
    tookMs: Date.now() - started,
    mailTransport: mail.transport,
    steps,
  });
});
