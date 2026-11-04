import { beforeAll, describe, expect, it, vi } from 'vitest';
const mail = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/mailer.js', () => ({ sendMail: mail, isConfigured: () => true, mailStatus: () => ({}), activeTransport: () => 'none' }));
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';
let enqueue: typeof import('../src/lib/outbox.js').queueEmail;
let db: typeof import('../src/db/index.js').db;
beforeAll(async () => {
  const app = await import('../src/app.js');
  await app.ready;
  db = (await import('../src/db/index.js')).db;
  const outbox = await import('../src/lib/outbox.js');
  enqueue = outbox.queueEmail;
});
describe('outbox delivery evidence (all transports mocked; no email sent)', () => {
  it.each(['smtp', 'brevo', 'resend'])('persists %s failure rather than pretending transport is absent', async (transport) => {
    mail.mockResolvedValue({ sent: false, transport, error: 'Test provider refusal' });
    const row = await enqueue({ to: 'audit@example.test', subject: 'Isolated fixture', body: 'Not sent' });
    expect(row.sendError).toBe('Test provider refusal');
    expect(await db.prepare('SELECT sent_at, send_error FROM dev_outbox WHERE id=?').get(row.id)).toMatchObject({ sent_at: null, send_error: 'Test provider refusal' });
  });
  it('leaves unconfigured distinct from failed', async () => {
    mail.mockResolvedValue({ sent: false, transport: 'none' });
    const row = await enqueue({ to: 'audit@example.test', subject: 'Isolated fixture', body: 'Not sent' });
    expect(row.sendError).toBeNull();
    expect(row.sentAt).toBeNull();
  });
  it('stamps provider acceptance, not a claim of inbox delivery', async () => {
    mail.mockResolvedValue({ sent: true, transport: 'brevo' });
    const row = await enqueue({ to: 'audit@example.test', subject: 'Isolated fixture', body: 'Not sent' });
    expect(row.sentAt).toEqual(expect.any(String));
    expect(row.sendError).toBeNull();
  });
});
