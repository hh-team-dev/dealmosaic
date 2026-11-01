import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem?: number },
) => Promise<Buffer>;

/**
 * Password hashing: scrypt with a per-password salt.
 * N=2^15 in production, 2^14 in development so test runs stay fast.
 * Format: scrypt$N$r$p$saltB64$hashB64 — self-describing, so parameters can be
 * raised later without invalidating existing hashes.
 */
const N = process.env.NODE_ENV === 'production' ? 32768 : 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 128 * N * R * 2 });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [alg, nStr, rStr, pStr, saltB64, hashB64] = stored.split('$');
    if (alg !== 'scrypt' || !nStr || !rStr || !pStr || !saltB64 || !hashB64) return false;
    const n = Number(nStr);
    const r = Number(rStr);
    const p = Number(pStr);
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const actual = await scrypt(password, salt, expected.length, { N: n, r, p, maxmem: 128 * n * r * 2 });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Opaque session/verification token: 256 bits of entropy, base64url. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Only the hash is stored, so a database leak cannot be replayed as sessions. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** IP is hashed before storage: we need abuse detection, not identities. */
export function hashIp(ip: string): string {
  return createHash('sha256').update(`dm:${ip}`).digest('hex').slice(0, 32);
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
