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
 * HISTORY — this check rejected every real registration for hours, and the
 * reason is worth recording because it is not obvious from the code.
 *
 * The original version compared the Origin header's host with the request's own
 * Host header. That works when the same server serves the page and the API. In
 * production it does not: the browser is on dealmosaic.pages.dev, Cloudflare
 * proxies /api/* to dealmosaic-api.onrender.com, so Render receives
 *
 *     Origin: https://dealmosaic.pages.dev
 *     Host:   dealmosaic-api.onrender.com
 *
 * Two different hosts, correctly. The check called that a cross-origin attack
 * and returned 403. Curl and the test suite sent no Origin header at all, so
 * the entire suite passed while no human could sign up.
 *
 * The fix is an explicit allowlist of the origins we actually own, which is also
 * the stronger CSRF defence: an attacker's page cannot forge the Origin header,
 * so allowing known origins blocks them just as firmly as a Host comparison —
 * without breaking a legitimate proxy.
 *
 * SITE_URL, the API's own origin and localhost are accepted. Anything else is
 * refused. Requests with no Origin at all are non-browser clients (curl, tests,
 * server-to-server) and cannot ride a victim's cookie, so they pass.
 */
const ALLOWED_ORIGINS = new Set<string>();

function allowedOrigins(c: Context): Set<string> {
  if (ALLOWED_ORIGINS.size === 0) {
    const configured = (process.env.SITE_URL ?? '').trim();
    if (configured) {
      try {
        ALLOWED_ORIGINS.add(new URL(configured).origin);
      } catch {
        // A malformed SITE_URL must not silently widen access; ignore it.
      }
    }
    // Additional origins, comma-separated, for preview domains and custom domains.
    for (const extra of (process.env.ALLOWED_ORIGINS ?? '').split(',')) {
      const t = extra.trim();
      if (!t) continue;
      try {
        ALLOWED_ORIGINS.add(new URL(t).origin);
      } catch {
        /* ignore malformed entries */
      }
    }
    ALLOWED_ORIGINS.add('http://localhost:5173');
    ALLOWED_ORIGINS.add('http://localhost:8788');
  }

  const set = new Set(ALLOWED_ORIGINS);
  // The API's own origin is always legitimate — this covers direct calls to the
  // Render URL, onrender.com preview hosts, and the case where SITE_URL is unset.
  const selfHost = c.req.header('x-forwarded-host') ?? c.req.header('host');
  if (selfHost) {
    set.add(`https://${selfHost}`);
    set.add(`http://${selfHost}`);
  }
  return set;
}

export function assertSameOrigin(c: Context): void {
  const origin = c.req.header('origin');
  if (!origin) return;

  let normalized: string;
  try {
    normalized = new URL(origin).origin;
  } catch {
    throw forbidden('Invalid origin.');
  }

  if (!allowedOrigins(c).has(normalized)) {
    throw forbidden('Cross-origin request blocked.');
  }
}
