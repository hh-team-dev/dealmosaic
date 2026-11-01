import { db, newId, nowIso } from '../db/index.js';

/**
 * Security log. Records what happened, when, and from which hashed IP.
 * No emails, no names, no tokens — the log must never become a PII store.
 */
export function logAuthEvent(input: {
  userId?: string | null;
  event: string;
  ipHash?: string | null;
  detail?: string;
}): void {
  db.prepare(
    'INSERT INTO auth_events (id, user_id, event, ip_hash, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(
    newId(),
    input.userId ?? null,
    input.event,
    input.ipHash ?? null,
    input.detail ?? null,
    nowIso(),
  );
}
