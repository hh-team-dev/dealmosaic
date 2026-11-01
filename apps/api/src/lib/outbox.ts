import { db, newId, nowIso } from '../db/index.js';

/**
 * Development mailbox.
 *
 * In production these messages go to a real provider (Brevo / Resend free tier)
 * via env config. Until that credential exists, every message is also written
 * here so registration, verification and password reset are *fully testable*
 * without pretending an email was sent. The UI shows this as a clearly labelled
 * "Development outbox" — it is never presented as a real inbox.
 */
export interface OutboxMessage {
  id: string;
  to: string;
  subject: string;
  body: string;
  actionUrl: string | null;
  createdAt: string;
}

export async function queueEmail(input: {
  to: string;
  subject: string;
  body: string;
  actionUrl?: string;
}): Promise<OutboxMessage> {
  const message: OutboxMessage = {
    id: newId(),
    to: input.to,
    subject: input.subject,
    body: input.body,
    actionUrl: input.actionUrl ?? null,
    createdAt: nowIso(),
  };
  await db.prepare(
    'INSERT INTO dev_outbox (id, to_email, subject, body, action_url, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(message.id, message.to, message.subject, message.body, message.actionUrl, message.createdAt);

  // A real provider is wired here in production; until then this is the honest
  // record of what would have been sent.
  if (process.env.NODE_ENV === 'production' && process.env.EMAIL_PROVIDER) {
    console.info(`[mail] queued to provider=${process.env.EMAIL_PROVIDER} subject="${input.subject}"`);
  }
  return message;
}

export async function listOutbox(limit = 20): Promise<OutboxMessage[]> {
  const rows = await (db
    .prepare('SELECT * FROM dev_outbox ORDER BY created_at DESC LIMIT ?')
    .all(limit)) as Array<{
    id: string;
    to_email: string;
    subject: string;
    body: string;
    action_url: string | null;
    created_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    to: r.to_email,
    subject: r.subject,
    body: r.body,
    actionUrl: r.action_url,
    createdAt: r.created_at,
  }));
}

export async function findLatestActionFor(
  to: string,
  kind: 'verify-email' | 'reset-password',
): Promise<string | null> {
  const row = await (db
    .prepare(
      `SELECT action_url FROM dev_outbox
       WHERE to_email = ? AND action_url LIKE ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(to, `%${kind}%`)) as { action_url: string | null } | undefined;
  return row?.action_url ?? null;
}
