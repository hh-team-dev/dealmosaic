/**
 * Real email delivery, on zero-cost transports.
 *
 * ORDER OF PREFERENCE — and why this order is not the obvious one:
 *
 *  1. **HTTPS API** (Brevo, then Resend). Sends over port 443.
 *  2. **SMTP** (Gmail app password, or any relay). Kept for hosts that allow it.
 *  3. **None** — nothing configured. Nothing is sent and nothing is pretended.
 *
 * WHY HTTPS FIRST: Render's free tier has blocked outbound SMTP on ports 25, 465
 * and 587 since September 2025. A Gmail app password is therefore **unusable in
 * production here** — the connection is severed during the TLS handshake, long
 * before authentication, and the failure looks like a mysterious timeout rather
 * than a credentials problem. This was discovered by testing, not by reading
 * docs: the first real send returned `Connection timeout`.
 *
 * HTTPS APIs are unaffected by the block: they are ordinary outbound 443 traffic.
 *
 * WHY BREVO FIRST: its free tier is 300 emails/day, needs no credit card, and —
 * crucially — lets you verify a **single sender address** by clicking a link in
 * an email. Resend requires a verified *domain* to send to anyone other than
 * yourself. Before the project owns a domain, single-sender verification is the
 * difference between working and not working.
 *
 * Port 2525 is a known escape hatch for some relays (Brevo, SMTP2GO) but Gmail
 * does not listen on it, so it does not rescue the Gmail route.
 *
 * FAILURE POLICY: a failed send NEVER throws. Registration must not fail because
 * an email bounced. The error is recorded on the outbox row and logged.
 */
import { createTransport, type Transporter } from 'nodemailer';

export type MailTransport = 'brevo' | 'resend' | 'smtp' | 'none';

export interface MailResult {
  sent: boolean;
  transport: MailTransport;
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
    /**
     * Google displays app passwords as "abcd efgh ijkl mnop". Users paste them
     * with the spaces; the real secret is the 16 characters. Stripping
     * whitespace means a correctly copied password always works.
     */
    pass: (env.SMTP_PASS ?? '').replace(/\s+/g, ''),
    from: env.MAIL_FROM?.trim() || env.SMTP_USER?.trim() || '',
  };
}

/** Which transport will be used, without attempting a send. */
export function activeTransport(env: NodeJS.ProcessEnv = process.env): MailTransport {
  if (env.BREVO_API_KEY?.trim()) return 'brevo';
  if (env.RESEND_API_KEY?.trim()) return 'resend';
  const s = settings(env);
  if (s.user && s.pass) return 'smtp';
  return 'none';
}

/** True only when a transport is actually available. */
export function isConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return activeTransport(env) !== 'none';
}

/** Exposed for the health endpoint and the admin panel. Never leaks a secret. */
export function mailStatus(env: NodeJS.ProcessEnv = process.env): {
  configured: boolean;
  transport: MailTransport;
  host: string | null;
  from: string | null;
} {
  const s = settings(env);
  const transport = activeTransport(env);
  const host =
    transport === 'brevo' ? 'api.brevo.com' : transport === 'resend' ? 'api.resend.com' : transport === 'smtp' ? s.host : null;
  return {
    configured: transport !== 'none',
    transport,
    host,
    from: transport === 'none' ? null : s.from || env.MAIL_FROM?.trim() || null,
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

/** Brevo HTTPS API. Free tier: 300/day, single-sender verification, no card. */
async function sendBrevo(input: MailInput, apiKey: string, from: string): Promise<MailResult> {
  const senderEmail = from || settings(process.env).from;
  if (!senderEmail) {
    return { sent: false, transport: 'brevo', error: 'MAIL_FROM (the verified sender) is not set.' };
  }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: 'DEALMOSAIC' },
        to: [{ email: input.to }],
        subject: input.subject,
        textContent: renderBody(input),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      // Brevo returns { code, message } on failure — surface it verbatim; the
      // message names the real problem (unverified sender, bad key, quota).
      const body = await res.text();
      let detail = body;
      try {
        const parsed = JSON.parse(body) as { message?: string };
        detail = parsed.message ?? body;
      } catch {
        /* keep raw body */
      }
      return { sent: false, transport: 'brevo', error: `HTTP ${res.status}: ${detail}`.slice(0, 300) };
    }
    const data = (await res.json()) as { messageId?: string };
    return { sent: true, transport: 'brevo', messageId: data.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { sent: false, transport: 'brevo', error: message };
  }
}

/** Resend HTTPS API. Free tier needs a verified domain to send to others. */
async function sendResend(input: MailInput, apiKey: string, from: string): Promise<MailResult> {
  const sender = from || 'onboarding@resend.dev';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: sender,
        to: [input.to],
        subject: input.subject,
        text: renderBody(input),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text();
      let detail = body;
      try {
        const parsed = JSON.parse(body) as { message?: string };
        detail = parsed.message ?? body;
      } catch {
        /* keep raw body */
      }
      return { sent: false, transport: 'resend', error: `HTTP ${res.status}: ${detail}`.slice(0, 300) };
    }
    const data = (await res.json()) as { id?: string };
    return { sent: true, transport: 'resend', messageId: data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { sent: false, transport: 'resend', error: message };
  }
}

export async function sendMail(
  input: MailInput,
  env: NodeJS.ProcessEnv = process.env,
): Promise<MailResult> {
  const choice = activeTransport(env);

  const result =
    choice === 'brevo'
      ? await sendBrevo(input, env.BREVO_API_KEY!.trim(), env.MAIL_FROM?.trim() || '')
      : choice === 'resend'
        ? await sendResend(input, env.RESEND_API_KEY!.trim(), env.MAIL_FROM?.trim() || '')
        : choice === 'smtp'
          ? await sendViaSmtp(input, env)
          : { sent: false as const, transport: 'none' as const, error: 'No email transport configured.' };

  if (!result.sent && result.transport !== 'none') {
    // Never rethrow: a dead mail provider must not stop a user registering.
    console.error(`[mail] ${result.transport} failed for ${input.to}: ${result.error}`);
  }
  return result;
}

async function sendViaSmtp(input: MailInput, env: NodeJS.ProcessEnv): Promise<MailResult> {
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
    const message = error instanceof Error ? error.message : String(error);
    // The most common production cause deserves a readable explanation.
    const hint =
      /timeout|ETIMEDOUT|ECONNREFUSED|ECONNRESET|closed/i.test(message)
        ? ' — this looks like a blocked SMTP port. Render free blocks 25/465/587; use BREVO_API_KEY over HTTPS instead.'
        : '';
    return { sent: false, transport: 'smtp', error: (message + hint).slice(0, 400) };
  }
}

/** Test seam: drop the cached transport so environment changes take effect. */
export function resetTransport(): void {
  cached = null;
  cachedKey = '';
}
