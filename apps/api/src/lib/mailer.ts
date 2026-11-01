/**
 * Real email delivery, on a zero-cost transport.
 *
 * THREE TRANSPORTS, in order of preference:
 *
 *  1. **SMTP** (Gmail app password, Brevo, Resend SMTP, anything). Chosen when
 *     SMTP_HOST/SMTP_USER/SMTP_PASS are set. Gmail works today with no domain
 *     and no payment, which is what makes verification emails possible before
 *     the project owns a domain.
 *  2. **None** — no credentials. Nothing is sent and nothing is pretended; the
 *     message is still written to the outbox table so the whole flow stays
 *     testable. `isConfigured()` reports false and the UI says so.
 *
 * WHY GMAIL FIRST: sending transactional mail from a custom domain requires
 * SPF/DKIM records, i.e. a domain. A free Gmail account with an App Password is
 * authenticated by Google, so it passes SPF/DKIM and lands in inboxes, at ~500
 * recipients/day. That is a legitimate launch-scale bridge, not a permanent
 * answer — see docs/20-email-delivery.md.
 *
 * FAILURE POLICY: a failed send NEVER throws. Registration must not fail because
 * an email bounced. The error is recorded on the outbox row and logged.
 */
import { createTransport, type Transporter } from 'nodemailer';

export interface MailResult {
  sent: boolean;
  transport: 'smtp' | 'none';
  messageId?: string;
  error?: string;
}

export interface MailInput {
  to: string;
  subject: string;
  body: string;
  actionUrl?: string | null;
}

let cached: Transporter | null = null;
let cachedKey = '';

function settings(env: NodeJS.ProcessEnv) {
  return {
    host: env.SMTP_HOST?.trim() || 'smtp.gmail.com',
    port: Number(env.SMTP_PORT?.trim() || 587),
    secure: (env.SMTP_SECURE?.trim() || 'false') === 'true',
    user: env.SMTP_USER?.trim() || '',
    pass: env.SMTP_PASS?.trim() || '',
    from: env.MAIL_FROM?.trim() || env.SMTP_USER?.trim() || '',
  };
}

/** True only when credentials are actually present. */
export function isConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const s = settings(env);
  return Boolean(s.user && s.pass);
}

/** Exposed for the health endpoint and the admin panel. Never leaks the password. */
export function mailStatus(env: NodeJS.ProcessEnv = process.env): {
  configured: boolean;
  host: string | null;
  from: string | null;
} {
  const s = settings(env);
  const on = isConfigured(env);
  return {
    configured: on,
    host: on ? s.host : null,
    from: on ? s.from : null,
  };
}

function transport(env: NodeJS.ProcessEnv): Transporter | null {
  const s = settings(env);
  if (!s.user || !s.pass) return null;
  // Rebuild the transport only when the credentials actually change, so a
  // long-lived process reuses one connection pool.
  const key = `${s.host}:${s.port}:${s.secure}:${s.user}:${s.pass.length}`;
  if (cached && cachedKey === key) return cached;
  cached = createTransport({
    host: s.host,
    port: s.port,
    secure: s.secure,
    auth: { user: s.user, pass: s.pass },
    // Gmail is slow to hand off; 10 s is generous but bounded.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
  });
  cachedKey = key;
  return cached;
}

/**
 * Renders the plain-text message. Deliberately plain text: it needs no HTML
 * template stack, it cannot break, and it reads correctly in every client.
 */
export function renderBody(input: MailInput): string {
  const lines = [input.body.trim()];
  if (input.actionUrl) {
    lines.push('', input.actionUrl);
  }
  lines.push(
    '',
    '—',
    'DEALMOSAIC',
    'You received this because someone used this address on dealmosaic.',
    'If that was not you, ignore this email; nothing will happen.',
  );
  return lines.join('\n');
}

export async function sendMail(
  input: MailInput,
  env: NodeJS.ProcessEnv = process.env,
): Promise<MailResult> {
  const t = transport(env);
  if (!t) return { sent: false, transport: 'none', error: 'No SMTP credentials configured.' };

  const s = settings(env);
  try {
    const info = await t.sendMail({
      from: s.from,
      to: input.to,
      subject: input.subject,
      text: renderBody(input),
    });
    return { sent: true, transport: 'smtp', messageId: info.messageId };
  } catch (error) {
    // Never rethrow: a dead mail server must not stop a user registering.
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[mail] send failed to ${input.to}: ${message}`);
    return { sent: false, transport: 'smtp', error: message };
  }
}

/** Test seam: drop the cached transport so environment changes take effect. */
export function resetTransport(): void {
  cached = null;
  cachedKey = '';
}
