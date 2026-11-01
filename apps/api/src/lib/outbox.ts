import { db, newId, nowIso } from '../db/index.js';
import { sendMail, isConfigured as mailConfigured } from './mailer.js';

/**
 * Outbox — the record of every message the system tried to deliver.
 *
 * Two things happen on each send:
 *   1. The row is written here FIRST, so there is always an audit trail even if
 *      delivery fails. This is what makes "we sent you a link" verifiable.
 *   2. Delivery is attempted through lib/mailer.ts (SMTP, typically a Gmail app
 *      password — no domain and no cost required). The outcome is recorded on
 *      the row: `sentAt` on success, `sendError` on failure.
 *
 * When no mail credentials exist the message is still recorded and the send is
 * skipped — the flow stays fully testable, and nothing ever pretends an email
 * went out. The dev-only endpoint exposes these rows; it is not a real inbox.
 */
export interface OutboxMessage {
  id: string;
  to: string;
  subject: string;
  body: string;
  actionUrl: string | null;
  createdAt: string;
  /** When delivery succeeded. Null when the transport is unconfigured or failed. */
  sentAt: string | null;
  /** Why delivery failed, for the admin panel. Never shown to end users. */
  sendError: string | null;
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
    sentAt: null,
    sendError: null,
  };

  // Record first, deliver second: the audit trail must survive a dead mail server.
  await db
    .prepare(
      `INSERT INTO dev_outbox (id, to_email, subject, body, action_url, created_at, sent_at, send_error)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`,
    )
    .run(message.id, message.to, message.subject, message.body, message.actionUrl, message.createdAt);

  const result = await sendMail({
    to: input.to,
    subject: input.subject,
    body: input.body,
    actionUrl: input.actionUrl ?? null,
  });

  if (result.sent) {
    message.sentAt = nowIso();
    await db.prepare('UPDATE dev_outbox SET sent_at = ? WHERE id = ?').run(message.sentAt, message.id);
  } else if (result.transport === 'smtp') {
    message.sendError = result.error ?? 'Unknown delivery error';
    await db
      .prepare('UPDATE dev_outbox SET send_error = ? WHERE id = ?')
      .run(message.sendError, message.id);
  }
  // transport 'none' leaves both null: not sent, not failed — simply no mail
  // configured, which is a different and honest state.

  return message;
}

/** Whether real mail delivery is available right now. */
export function emailDeliveryConfigured(): boolean {
  return mailConfigured();
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
    sent_at: string | null;
    send_error: string | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    to: r.to_email,
    subject: r.subject,
    body: r.body,
    actionUrl: r.action_url,
    createdAt: r.created_at,
    sentAt: r.sent_at,
    sendError: r.send_error,
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
