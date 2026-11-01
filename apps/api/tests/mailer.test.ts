import { describe, expect, it, beforeEach } from 'vitest';
import { isConfigured, mailStatus, renderBody, resetTransport, sendMail } from '../src/lib/mailer.js';

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

  it('defaults to Gmail SMTP, the zero-cost transport that needs no domain', () => {
    const status = mailStatus(env({ SMTP_USER: 'a@b.c', SMTP_PASS: 'x' }));
    expect(status.host).toBe('smtp.gmail.com');
  });
});

describe('sendMail without a transport', () => {
  it('returns sent:false with transport "none" and does not throw', async () => {
    const result = await sendMail({ to: 'x@y.z', subject: 's', body: 'b' }, env());
    expect(result).toEqual({ sent: false, transport: 'none', error: expect.any(String) });
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
