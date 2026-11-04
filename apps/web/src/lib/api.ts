/** Thin typed client for the DEALMOSAIC API.
 *  Holds the CSRF token in memory only (never localStorage) and always sends
 *  cookies as same-origin so the httpOnly session cookie does the authenticating. */

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  payload?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
    payload?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.payload = payload;
  }
}

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError(0, 'offline', 'You are offline. Reconnect and try again. No action has been queued.');
  }
  const headers: Record<string, string> = { accept: 'application/json', ...options.headers };

  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers['x-csrf-token'] = csrfToken;

  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  else options.signal?.addEventListener('abort', cancel, { once: true });
  // Leave room for a free-host cold start, but never leave a form busy forever.
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 45_000);
  let res: Response;
  let text: string;
  try {
    res = await fetch(path, {
      method, headers, credentials: 'same-origin', cache: 'no-store',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    text = await res.text();
  } catch (err) {
    if (timedOut) throw new ApiError(0, 'timeout', 'This is taking too long. Please try again.');
    if (options.signal?.aborted || (err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'network', 'We could not reach DEALMOSAIC. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
  let data: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object') data = parsed as Record<string, unknown>;
  } catch { /* Invalid/HTML responses are handled below, not passed to views as success. */ }
  if (!res.ok) {
    const errorBody = (typeof data?.error === 'object' && data.error ? data.error : {}) as { code?: string; message?: string; fields?: Record<string, string> };
    throw new ApiError(
      res.status,
      errorBody.code ?? (typeof data?.error === 'string' ? data.error : 'error'),
      errorBody.message ?? (typeof data?.message === 'string' ? data.message : 'Something went wrong. Please try again.'),
      errorBody.fields,
      data ?? undefined,
    );
  }
  if (data === null && res.status !== 204) {
    throw new ApiError(502, 'invalid_response', 'The service returned an unreadable response. Please try again.');
  }

  return data as T;
}

export interface SessionResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
    role: string;
    createdAt: string;
    phone: string | null;
  } | null;
  preferences: {
    countryCode: string;
    displayCurrency: string;
    pincode: string | null;
    notifyInApp: boolean;
    notifyEmail: boolean;
  } | null;
  csrfToken: string | null;
}
