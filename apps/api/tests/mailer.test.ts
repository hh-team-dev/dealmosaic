import { describe, expect, it, beforeEach } from 'vitest';
import { activeTransport, isConfigured, mailStatus, renderBody, resetTransport, sendMail } from '../src/lib/mailer.js';

/**
 * The rule these tests defend: email is a convenience, never a dependency.
 * A broken mail server must not stop anyone registering, and the app must never
 * claim it sent something it did not.
 */

const env = (over: Record<string, string> = {}) => ({ ...over }) as NodeJS.ProcessEnv;

describe('mail configuration', () => {
  beforeEach(() => resetTransport());

  it('reports not configured when credentials are absent', () => {
    expect(isConfigured(env())).toBe(false);
    expect(mailStatus(env()).configured).toBe(false);
  });

  it('requires BOTH a user and a password', () => {
    expect(isConfigured(env({ SMTP_USER: 'a@b.c' }))).toBe(false);
    expect(isConfigured(env({ SMTP_PASS: 'secret' }))).toBe(false);
    expect(isConfigured(env({ SMTP_USER: 'a@b.c', SMTP_PASS: 'secret' }))).toBe(true);
  });

  it('never exposes the password in status output', () => {
    const status = mailStatus(env({ SMTP_USER: 'a@b.c', SMTP_PASS: 'super-secret-value' }));
    expect(JSON.stringify(status)).not.toContain('super-secret-value');
    expect(status.from).toBe('a@b.c');
  });

  it('defaults to Gmail SMTP when only SMTP credentials exist', () => {
    const status = mailStatus(env({ SMTP_USER: 'a@b.c', SMTP_PASS: 'x' }));
    expect(status.host).toBe('smtp.gmail.com');
  });

  it('prefers an HTTPS transport over SMTP, because Render free blocks SMTP', () => {
    const both = env({ SMTP_USER: 'a@b.c', SMTP_PASS: 'x', BREVO_API_KEY: 'k' });
    expect(activeTransport(both)).toBe('brevo');
  });

  it('selects Brevo when only a Brevo key is present', () => {
    expect(activeTransport(env({ BREVO_API_KEY: 'k' }))).toBe('brevo');
    expect(mailStatus(env({ BREVO_API_KEY: 'k' })).host).toBe('api.brevo.com');
  });

  it('falls back to Resend when only a Resend key is present', () => {
    expect(activeTransport(env({ RESEND_API_KEY: 'k' }))).toBe('resend');
    expect(mailStatus(env({ RESEND_API_KEY: 'k' })).host).toBe('api.resend.com');
  });

  it('tolerates an app password pasted with the spaces Google displays', () => {
    // Google shows "abcd efgh ijkl mnop"; the secret is the 16 characters.
    const spaced = env({ SMTP_USER: 'a@b.c', SMTP_PASS: 'abcd efgh ijkl mnop' });
    expect(activeTransport(spaced)).toBe('smtp');
  });
});

describe('sendMail without a transport', () => {
  it('returns sent:false with transport "none" and does not throw', async () => {
    const result = await sendMail({ to: 'x@y.z', subject: 's', body: 'b' }, env());
    expect(result).toEqual({ sent: false, transport: 'none', error: expect.any(String) });
  });
});

describe('sendMail over HTTPS', () => {
  it('reports a clear Brevo error rather than throwing when the key is rejected', async () => {
    const result = await sendMail(
      { to: 'x@y.z', subject: 's', body: 'b' },
      env({ BREVO_API_KEY: 'test-placeholder-key', MAIL_FROM: 'a@b.c' }),
    );
    expect(result.sent).toBe(false);
    expect(result.transport).toBe('brevo');
    expect(result.error).toBeTruthy();
    expect(String(result.error)).toMatch(/HTTP \d{3}|fetch|timeout|network/i);
  }, 20_000);

  it('refuses to send over Brevo without a sender address', async () => {
    const result = await sendMail({ to: 'x@y.z', subject: 's', body: 'b' }, env({ BREVO_API_KEY: 'k' }));
    expect(result.sent).toBe(false);
    expect(result.error).toContain('MAIL_FROM');
  });
});

describe('sendMail with broken credentials', () => {
  it('fails softly — an Error object, never a thrown exception', async () => {
    resetTransport();
    const result = await sendMail(
      { to: 'nobody@example.invalid', subject: 's', body: 'b' },
      env({ SMTP_USER: 'nobody@example.invalid', SMTP_PASS: 'wrong', SMTP_HOST: '127.0.0.1', SMTP_PORT: '2525' }),
    );
    expect(result.sent).toBe(false);
    expect(result.transport).toBe('smtp');
    expect(typeof result.error).toBe('string');
  }, 20_000);
});

describe('message rendering', () => {
  it('includes the action link on its own line', () => {
    const text = renderBody({ to: 'a@b.c', subject: 's', body: 'Confirm please', actionUrl: 'https://x.test/verify?token=1' });
    expect(text).toContain('Confirm please');
    expect(text).toContain('https://x.test/verify?token=1');
  });

  it('omits the link line when there is no action', () => {
    const text = renderBody({ to: 'a@b.c', subject: 's', body: 'Just a note' });
    expect(text).not.toContain('undefined');
    expect(text).toContain('Just a note');
  });

  it('always carries a footer explaining why the mail arrived', () => {
    const text = renderBody({ to: 'a@b.c', subject: 's', body: 'x' });
    expect(text).toContain('If that was not you');
  });
});
