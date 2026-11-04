import {it,expect,vi} from 'vitest';
import edge from '../public/_worker.js';
it.each(['/pwa-shell.html','/pwa-shell'])('serves %s without Cloudflare HTML canonicalization redirects',async(path)=>{
 const assetFetch=vi.fn(async(input:URL)=>{expect(input.pathname).toBe('/pwa-shell');return new Response('<main>Generic offline shell</main>',{headers:{'cache-control':'public,max-age=0'}});});
 const response=await edge.fetch(new Request('https://dealmosaic.example'+path),{ASSETS:{fetch:assetFetch}});
 expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');expect(await response.text()).toContain('Generic offline shell');expect(response.headers.get('location')).toBeNull();
});
