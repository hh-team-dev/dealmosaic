import { db, newId, nowIso } from '../db/index.js';
import { queueEmail } from '../lib/outbox.js';

/**
 * THE SAVED-DEAL NUDGE.
 *
 * The owner's question was the right one: if somebody saves a deal, do they hear
 * about it again? Until now, no — the list sat in their browser and never spoke.
 * A wishlist nobody is reminded of is a bookmark folder.
 *
 * What this sends, and what it refuses to send:
 *
 *   • **Three reasons to write, and only three.** A saved deal is about to
 *     expire (within 7 days), a saved deal has just expired (once, so the shopper
 *     can delete it), or a saved deal is new since the last digest.
 *   • **One email per shopper per week, maximum.** Enforced by `notified_at` on
 *     the saved row, not by a promise in a comment. If there is nothing worth
 *     saying, no email is sent at all — an empty "you have 0 saved deals" message
 *     is the fastest way to be marked as spam.
 *   • **Respects the switch.** `user_preferences.notify_email = 0` means never,
 *     immediately, with no grace period.
 *   • **Only for people who agreed to it.** A shopper who never signed in has no
 *     saved rows here, so nothing is guessed and nothing is emailed.
 *
 * Why weekly rather than daily: a deal list changes slowly. Daily mail about a
 * static list trains people to ignore the sender, and the one email that matters —
 * "your saved offer ends tomorrow" — gets ignored with it.
 */

const SITE_URL = (process.env.SITE_URL ?? 'https://dealmosaic.pages.dev').replace(/\/$/, '');
const MIN_GAP_MS = 7 * 24 * 3600 * 1000;
const EXPIRING_SOON_MS = 7 * 24 * 3600 * 1000;

interface SavedRow {
  user_id: string;
  saved_at: string;
  notified_at: string | null;
  coupon_id: string;
  platform_name: string;
  title: string;
  code: string | null;
  expires_at: string | null;
}

export interface DigestItem {
  couponId: string;
  store: string;
  title: string;
  code: string | null;
  expiresAt: string | null;
  reason: 'expiring' | 'expired' | 'new';
}

export interface DigestResult {
  considered: number;
  sent: number;
  skipped: number;
  details: Array<{ userId: string; email: string; items: number; sent: boolean; reason?: string }>;
}

/** What day is it in the shopper's mailbox? Day-first, no ambiguity. */
function day(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Where a saved item lives when it has no tracked link. */
function itemUrl(id: string): string {
  return `${SITE_URL}/deals?coupon=${encodeURIComponent(id)}`;
}

export function buildDigestEmail(
  displayName: string | null,
  items: DigestItem[],
): { subject: string; body: string; actionUrl: string } {
  const name = (displayName ?? '').split(' ')[0];
  const expiring = items.filter((i) => i.reason === 'expiring');
  const expired = items.filter((i) => i.reason === 'expired');
  const fresh = items.filter((i) => i.reason === 'new');

  /*
   * The subject says the single most useful thing in the email. "Your weekly
   * deals digest" is a subject that gets archived unread; "3 saved deals end this
   * week" is one that gets opened, because it is about something the shopper
   * already decided they wanted.
   */
  const subject = expiring.length
    ? `${expiring.length} saved deal${expiring.length === 1 ? '' : 's'} end${expiring.length === 1 ? 's' : ''} this week`
    : expired.length
      ? `A saved deal has ended`
      : `${fresh.length} deal${fresh.length === 1 ? '' : 's'} you saved`;

  const lines: string[] = [];
  lines.push(name ? `Hi ${name},` : 'Hi,');
  lines.push('');
  lines.push('You asked us to keep these. Here is where they stand.');

  if (expiring.length) {
    lines.push('');
    lines.push('ENDING THIS WEEK');
    for (const i of expiring) {
      lines.push(`• ${i.store} — ${i.title}`);
      if (i.code) lines.push(`  Code: ${i.code}`);
      if (i.expiresAt) lines.push(`  Ends ${day(i.expiresAt)}`);
    }
  }
  if (fresh.length) {
    lines.push('');
    lines.push('ADDED SINCE WE LAST WROTE');
    for (const i of fresh) {
      lines.push(`• ${i.store} — ${i.title}`);
      if (i.code) lines.push(`  Code: ${i.code}`);
    }
  }
  if (expired.length) {
    lines.push('');
    lines.push('NO LONGER AVAILABLE');
    for (const i of expired) {
      lines.push(`• ${i.store} — ${i.title}`);
    }
    lines.push('  These have ended at the store. You can remove them from your saved list.');
  }

  lines.push('');
  lines.push('Nothing here is an advert: these are the offers you saved, copied from the store as it published them.');
  lines.push('');
  lines.push('— DealMosaic');
  lines.push('One email a week at most. Turn it off in Settings, any time.');

  return { subject, body: lines.join('\n'), actionUrl: `${SITE_URL}/saved` };
}

/**
 * Find everything worth telling each shopper, and tell them.
 *
 * `now` is a parameter so the weekly rule can be tested without waiting a week —
 * the same reason the alert service takes its price data as an argument.
 */
/**
 * The mailer is a parameter, not a hard import, for the same reason the affiliate
 * sync takes its fetcher as an argument: the behaviour that matters most — who is
 * written to, how often, and what the email says — can then be tested without
 * standing up an SMTP server or racing an in-memory database.
 */
export type Mailer = (input: {
  to: string;
  subject: string;
  body: string;
  actionUrl?: string | null;
}) => Promise<{ sent: boolean; error?: string }>;

/**
 * The real mailer is `queueEmail`, not `sendMail`, and the difference matters:
 * `queueEmail` writes the message to `dev_outbox` **before** handing it to Brevo,
 * so there is a record of every email this feature ever tried to send, with the
 * provider's own error when one fails. A digest that only calls `sendMail` leaves
 * nothing behind to debug when a shopper says "I never got it".
 */
const defaultMailer: Mailer = async (input) => {
  const message = await queueEmail({
    to: input.to,
    subject: input.subject,
    body: input.body,
    actionUrl: input.actionUrl ?? undefined,
  });
  return { sent: message.sentAt !== null, ...(message.sendError ? { error: message.sendError } : {}) };
};

export async function runSavedDigests(
  now: Date = new Date(),
  mail: Mailer = defaultMailer,
): Promise<DigestResult> {
  const nowMs = now.getTime();

  /*
   * ONE QUERY, NOT ONE PER PERSON.
   *
   * The first version fetched the saved rows, then looped over shoppers issuing a
   * second query each. Beyond being an N+1 on a job that runs daily over every
   * account, it interleaved statements on a single libSQL connection and produced
   * SQLITE_BUSY / TRANSACTION_ACTIVE under test — a real defect that only shows up
   * once more than one shopper has saved something. Joining the person's eligibility
   * into the same result set removes both problems at once.
   */
  const rows = (await db
    .prepare(
      `SELECT s.user_id, s.saved_at, s.notified_at, s.coupon_id,
              c.platform_slug AS platform_name, c.title, c.code, c.expires_at,
              u.email, u.display_name, u.email_verified_at, u.status,
              p.notify_email
         FROM saved_deals s
         JOIN coupons c ON c.id = s.coupon_id
         JOIN users u ON u.id = s.user_id
         LEFT JOIN user_preferences p ON p.user_id = u.id
        ORDER BY s.user_id, s.saved_at DESC`,
    )
    .all() as unknown as Array<SavedRow & {
    email: string;
    display_name: string | null;
    email_verified_at: string | null;
    status: string;
    notify_email: number | null;
  }>);

  const byUser = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byUser.get(r.user_id);
    if (list) list.push(r);
    else byUser.set(r.user_id, [r]);
  }

  const result: DigestResult = { considered: 0, sent: 0, skipped: 0, details: [] };

  for (const [userId, saves] of byUser) {
    result.considered += 1;

    const person = saves[0]!;

    /*
     * Four reasons not to write, checked in the order that costs least:
     * no verified address (we never email an unverified one — that is how a
     * domain gets flagged), the switch is off, the account is not active, or we
     * wrote to them in the last seven days.
     */
    if (!person.email_verified_at) {
      result.skipped += 1;
      result.details.push({ userId, email: person.email, items: 0, sent: false, reason: 'email not verified' });
      continue;
    }
    if (person.notify_email === 0) {
      result.skipped += 1;
      result.details.push({ userId, email: person.email, items: 0, sent: false, reason: 'switched off' });
      continue;
    }
    if (person.status !== 'active') {
      result.skipped += 1;
      result.details.push({ userId, email: person.email, items: 0, sent: false, reason: 'account inactive' });
      continue;
    }
    const lastWrite = saves.reduce<number>(
      (acc, s) => (s.notified_at ? Math.max(acc, new Date(s.notified_at).getTime()) : acc),
      0,
    );
    if (lastWrite && nowMs - lastWrite < MIN_GAP_MS) {
      result.skipped += 1;
      result.details.push({ userId, email: person.email, items: 0, sent: false, reason: 'wrote less than 7 days ago' });
      continue;
    }

    const items: DigestItem[] = [];
    for (const s of saves) {
      const expiresMs = s.expires_at ? new Date(s.expires_at).getTime() : null;
      const savedMs = new Date(s.saved_at).getTime();

      if (expiresMs !== null && expiresMs <= nowMs) {
        const endedLongAgo = nowMs - expiresMs > EXPIRING_SOON_MS;
        if (!endedLongAgo) {
          items.push({ couponId: s.coupon_id, store: s.platform_name, title: s.title, code: s.code, expiresAt: s.expires_at, reason: 'expired' });
        }
        continue;
      }
      if (expiresMs !== null && expiresMs - nowMs <= EXPIRING_SOON_MS) {
        items.push({ couponId: s.coupon_id, store: s.platform_name, title: s.title, code: s.code, expiresAt: s.expires_at, reason: 'expiring' });
        continue;
      }
      // Saved since the last thing we said to them, and still live.
      if (!lastWrite || savedMs > lastWrite) {
        items.push({ couponId: s.coupon_id, store: s.platform_name, title: s.title, code: s.code, expiresAt: s.expires_at, reason: 'new' });
      }
    }

    if (items.length === 0) {
      result.skipped += 1;
      result.details.push({ userId, email: person.email, items: 0, sent: false, reason: 'nothing worth saying' });
      continue;
    }

    // Cap the email at 12 items: a 60-item wall is a newsletter nobody reads.
    const capped = items.slice(0, 12);
    const composed = buildDigestEmail(person.display_name, capped);
    const sent = await mail({
      to: person.email,
      subject: composed.subject,
      body: composed.body,
      actionUrl: composed.actionUrl,
    });

    if (sent.sent) {
      result.sent += 1;
      await db
        .prepare('UPDATE saved_deals SET notified_at = ? WHERE user_id = ? AND coupon_id IN (' +
          capped.map(() => '?').join(',') + ')')
        .run(nowIso(), userId, ...capped.map((i) => i.couponId));
    } else {
      result.skipped += 1;
    }
    result.details.push({ userId, email: person.email, items: capped.length, sent: sent.sent, ...(sent.error ? { reason: sent.error } : {}) });
  }

  return result;
}

/** Save (or re-save) a deal for a signed-in shopper. Idempotent by design. */
export async function saveDeal(userId: string, couponId: string): Promise<{ saved: boolean; reason?: string }> {
  const exists = await db.prepare('SELECT id FROM coupons WHERE id = ?').get(couponId);
  if (!exists) return { saved: false, reason: 'That offer is no longer in the list.' };
  await db
    .prepare(
      `INSERT INTO saved_deals (id, user_id, coupon_id, saved_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, coupon_id) DO NOTHING`,
    )
    .run(newId(), userId, couponId, nowIso());
  return { saved: true };
}

export async function unsaveDeal(userId: string, couponId: string): Promise<void> {
  await db.prepare('DELETE FROM saved_deals WHERE user_id = ? AND coupon_id = ?').run(userId, couponId);
}

export function listSavedDealIds(userId: string): Promise<Array<{ couponId: string; savedAt: string }>> {
  return db
    .prepare('SELECT coupon_id AS couponId, saved_at AS savedAt FROM saved_deals WHERE user_id = ? ORDER BY saved_at DESC')
    .all(userId) as unknown as Promise<Array<{ couponId: string; savedAt: string }>>;
}

export { itemUrl };
