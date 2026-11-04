import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, setCsrfToken } from '../src/lib/api';
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); setCsrfToken(null); });
describe('API failure recovery', () => {
  it('does not treat an HTML success page as valid API data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>offline</html>')));
    await expect(apiRequest('/api/test')).rejects.toMatchObject({ code: 'invalid_response' });
  });
  it('keeps a top-level API error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'paused', message: 'The shop is paused.' }), { status: 503 })));
    await expect(apiRequest('/api/test')).rejects.toMatchObject({ code: 'paused', message: 'The shop is paused.' });
  });
  it('keeps structured field errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'invalid', message: 'Check fields', fields: { email: 'Required' } } }), { status: 400 })));
    await expect(apiRequest('/api/test')).rejects.toMatchObject({ code: 'invalid', fields: { email: 'Required' } });
  });
  it('bounds a stalled request and exposes a retryable timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_path, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))));
    const pending = expect(apiRequest('/api/test')).rejects.toMatchObject({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(45_001);
    await pending;
  });
  it('never uses the HTTP cache for API reads', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}')); vi.stubGlobal('fetch', fetcher);
    await apiRequest('/api/test'); expect(fetcher.mock.calls[0][1].cache).toBe('no-store');
  });
  it('fails offline mutations immediately without calling fetch or queueing', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher); vi.stubGlobal('navigator', { onLine: false });
    await expect(apiRequest('/api/test', { method: 'POST', body: {} })).rejects.toMatchObject({ code: 'offline' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('sends CSRF and same-origin credentials with mutations', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetcher); setCsrfToken('isolated-token');
    await apiRequest('/api/test', { method: 'POST', body: { check: true } });
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: 'same-origin', headers: { 'x-csrf-token': 'isolated-token' } });
  });
});
