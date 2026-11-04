import {it,expect,vi} from 'vitest';
import edge from '../public/_worker.js';
it.each(['/pwa-shell.html','/pwa-shell'])('serves %s without Cloudflare HTML canonicalization redirects',async(path)=>{
 const assetFetch=vi.fn(async(input:URL)=>{expect(input.pathname).toBe('/pwa-shell');return new Response('<main>Generic offline shell</main>',{headers:{'cache-control':'public,max-age=0'}});});
 const response=await edge.fetch(new Request('https://dealmosaic.example'+path),{ASSETS:{fetch:assetFetch}});
 expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');expect(await response.text()).toContain('Generic offline shell');expect(response.headers.get('location')).toBeNull();
});
it('keeps HTTP 404 when the shared app frame is served for an unknown route',async()=>{
 const assetFetch=vi.fn(async(input:URL|Request)=>new URL(input instanceof Request?input.url:input).pathname==='/404.html'?new Response('<div id="root">Shared app frame</div>'):new Response('missing',{status:404}));
 const response=await edge.fetch(new Request('https://dealmosaic.example/not-a-real-page'),{ASSETS:{fetch:assetFetch}});
 expect(response.status).toBe(404);expect(await response.text()).toContain('Shared app frame');
});
