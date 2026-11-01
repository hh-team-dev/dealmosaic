import { describe, expect, it } from 'vitest';

/**
 * Regression guard for a real incident.
 *
 * During development the suite was executed with TURSO_DATABASE_URL exported in
 * the shell. The tests connected to the PRODUCTION database and wrote 4 users,
 * 13 sessions, 40 auth events and assorted search history into it.
 *
 * A test suite must be structurally incapable of touching production, no matter
 * what the environment it inherits says. This test fails loudly if that guard is
 * ever removed.
 */
describe('database safety', () => {
  it('never connects to the remote database under a test runner', async () => {
    // Simulate the exact conditions of the incident.
    const originalUrl = process.env.TURSO_DATABASE_URL;
    process.env.TURSO_DATABASE_URL = 'libsql://production-should-never-be-used.turso.io';

    try {
      const { isRemote } = await import('../src/db/index.js');
      expect(isRemote).toBe(false);
    } finally {
      if (originalUrl === undefined) delete process.env.TURSO_DATABASE_URL;
      else process.env.TURSO_DATABASE_URL = originalUrl;
    }
  });

  it('runs against an in-memory or local file, not a network endpoint', async () => {
    const { isRemote } = await import('../src/db/index.js');
    expect(isRemote).toBe(false);
  });
});
