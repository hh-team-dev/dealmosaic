import type { Context } from 'hono';

export class ApiError extends Error {
  status: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 503;
  code: string;
  fields?: Record<string, string>;

  constructor(
    status: ApiError['status'],
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const badRequest = (m: string, f?: Record<string, string>) => new ApiError(400, 'bad_request', m, f);
export const unauthorized = (m = 'Sign in to continue.') => new ApiError(401, 'unauthorized', m);
export const forbidden = (m: string) => new ApiError(403, 'forbidden', m);
export const notFound = (m = 'Not found.') => new ApiError(404, 'not_found', m);
export const conflict = (m: string) => new ApiError(409, 'conflict', m);
export const tooMany = (m = 'Too many attempts. Try again in a few minutes.') =>
  new ApiError(429, 'rate_limited', m);

export function clientIp(c: Context): string {
  const fwd = c.req.header('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  const real = c.req.header('x-real-ip');
  if (real) return real.trim();
  return '0.0.0.0';
}

/**
 * Same-origin guard for every state-changing request.
 *
 * The SPA is served from the same origin as the API (Vite proxies /api in
 * development; Cloudflare serves both in production), so a browser will always
 * send a matching Origin. Requests with no Origin are non-browser clients
 * (curl, tests) and are allowed — they cannot ride a victim's cookies.
 */
export function assertSameOrigin(c: Context): void {
  const origin = c.req.header('origin');
  if (!origin) return;
  const host = c.req.header('x-forwarded-host') ?? c.req.header('host') ?? '';
  let originHost = '';
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden('Invalid origin.');
  }
  if (originHost !== host) {
    throw forbidden('Cross-origin request blocked.');
  }
}
