import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../../web/public/_worker.js';
const env = { API_ORIGIN: 'https://api.example.org', ASSETS: { fetch: vi.fn() } };
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('deployed Pages API proxy, not only the local test proxy', () => {
  it('passes a 302 to the browser without following the affiliate destination', async () => {
    const fetcher = vi.fn(async (req: Request) => {
      expect(req.url).toBe('https://api.example.org/api/go/fixture?src=shelf');
      expect(req.redirect).toBe('manual');
      return new Response(null, { status: 302, headers: { location: 'https://linksredirect.com/?cid=fixture', 'cache-control': 'no-store' } });
    });
    vi.stubGlobal('fetch', fetcher);
    const res = await worker.fetch(new Request('https://site.example.org/api/go/fixture?src=shelf'), env);
    expect(res.status).toBe(302); expect(fetcher).toHaveBeenCalledTimes(1);
    expect(res.headers.get('location')).toBe('https://linksredirect.com/?cid=fixture');
  });
  it('shows a safe recovery document when the offer backend fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('upstream unreachable')));
    const res = await worker.fetch(new Request('https://site.example.org/api/go/fixture', { headers: { accept: 'text/html' } }), env);
    expect(res.status).toBe(503); expect(res.headers.get('cache-control')).toBe('no-store');
    const text = await res.text(); expect(text).toContain('/store-link-help?offer=fixture');
    expect(text).toContain('not confirmed that the store opened'); expect(text).not.toContain('linksredirect.com');
  });
  it('ends a stuck store-link request instead of serving an indefinitely blank navigation', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((request: Request) => new Promise((_resolve, reject) => { request.signal.addEventListener('abort', () => reject(new Error('aborted'))); })));
    const response = worker.fetch(new Request('https://site.example.org/api/go/fixture', { headers: { accept: 'text/html' } }), env);
    await vi.advanceTimersByTimeAsync(12001);
    expect((await response).status).toBe(503);
  });
  it('returns JSON, not HTML, for a failed API details read', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('upstream unreachable')));
    const res = await worker.fetch(new Request('https://site.example.org/api/go/fixture/details', { headers: { accept: 'application/json' } }), env);
    expect(res.status).toBe(502); expect((await res.json()).error).toBe('upstream_unavailable');
  });
});

it('preserves request bodies, first-party headers and response cookies for other APIs', async () => {
  vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
    expect(request.method).toBe('POST'); expect(await request.text()).toBe('{"fixture":true}');
    expect(request.headers.get('cookie')).toBe('dm_session=local-fixture');
    expect(request.redirect).toBe('manual');
    return new Response('{}', { status: 201, headers: { 'set-cookie': 'fixture=ok; HttpOnly; Secure' } });
  }));
  const request = new Request('https://site.example.org/api/fixture', { method: 'POST', headers: { cookie: 'dm_session=local-fixture' }, body: '{"fixture":true}' });
  const res = await worker.fetch(request, env); expect(res.status).toBe(201); expect(res.headers.get('set-cookie')).toContain('HttpOnly');
});

it('replaces an upstream store-route 503 with readable local recovery', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', {status:503})));
  const res=await worker.fetch(new Request('https://site.example.org/api/go/fixture',{headers:{accept:'text/html'}}),env);
  expect(res.status).toBe(503);expect(await res.text()).toContain('Keep your code');
});
