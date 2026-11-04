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
  const headers: Record<string, string> = { accept: 'application/json', ...options.headers };

  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers['x-csrf-token'] = csrfToken;

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      credentials: 'same-origin',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'network', 'We could not reach DEALMOSAIC. Check your connection and try again.');
  }

  const text = await res.text();
  let data: Record<string, unknown> | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const errorBody = (data?.error ?? {}) as { code?: string; message?: string; fields?: Record<string, string> };
    throw new ApiError(
      res.status,
      errorBody.code ?? 'error',
      errorBody.message ?? 'Something went wrong. Please try again.',
      errorBody.fields,
      data ?? undefined,
    );
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
