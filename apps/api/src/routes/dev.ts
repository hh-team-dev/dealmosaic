import { Hono } from 'hono';
import { listOutbox } from '../lib/outbox.js';
import type { AppBindings } from '../middleware/session.js';

/**
 * Development-only mailbox endpoint.
 *
 * Returns 404 in production — the same guard as the rest of the dev tooling.
 * It exists so that registration, email verification and password reset are
 * genuinely testable before a real email provider is connected.
 */
export const devRoutes = new Hono<AppBindings>();

devRoutes.use('*', async (c, next) => {
  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: { code: 'not_found', message: 'Not found.' } }, 404);
  }
  await next();
});

devRoutes.get('/outbox', (c) => {
  const email = c.req.query('email');
  const all = listOutbox(25);
  const filtered = email ? all.filter((m) => m.to === email.toLowerCase()) : all;
  return c.json({
    dev: true,
    note: 'Development outbox — no real email was sent. In production these messages go through Brevo or Resend free tier.',
    messages: filtered,
  });
});
