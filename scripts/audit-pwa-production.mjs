/** Read-only production smoke check. No account cookies, mutations, payments or notifications. */
import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const base=process.argv[2]||'https://dealmosaic.pages.dev';
const output=process.argv[3]||'/tmp/dm-pwa-production.json';
const expected=JSON.parse(readFileSync('apps/web/dist/pwa-release.json','utf8'));
const releaseResponse=await fetch(base+'/pwa-release.json',{cache:'no-store'});
const release=await releaseResponse.json();assert.equal(release.build,expected.build);assert.equal(release.mode,'pwa');
const headers={};for(const path of ['/sw.js','/manifest.webmanifest','/pwa-release.json','/pwa-shell.html']){const response=await fetch(base+path,{cache:'no-store'});assert.equal(response.status,200);headers[path]=Object.fromEntries(['cache-control','content-type','service-worker-allowed','x-robots-tag'].map(name=>[name,response.headers.get(name)]));}
assert.match(headers['/sw.js']['cache-control'],/no-store/);assert.match(headers['/sw.js']['content-type'],/javascript/);assert.equal(headers['/sw.js']['service-worker-allowed'],'/');assert.match(headers['/manifest.webmanifest']['content-type'],/manifest\+json/);assert.match(headers['/pwa-release.json']['cache-control'],/no-store/);assert.match(headers['/pwa-shell.html']['x-robots-tag'],/noindex/);
const manifest=await(await fetch(base+'/manifest.webmanifest')).json();assert.equal(manifest.id,'/');assert.equal(manifest.display,'standalone');
const shop=await(await fetch(base+'/api/direct/products')).json();
const results=[];const axe=readFileSync('node_modules/axe-core/axe.min.js','utf8');
for(const [engine,type]of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try {
 await page.goto(base+'/install',{waitUntil:'networkidle'});await page.getByText('Offline ready',{exact:true}).waitFor({timeout:30000});await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 let installability=null;if(engine==='chromium'){const cdp=await context.newCDPSession(page);installability=await cdp.send('Page.getInstallabilityErrors');assert.deepEqual(installability.installabilityErrors,[]);}
 const states=[];
 async function scan(label){await page.addScriptTag({content:axe});const state=await page.evaluate(async()=>({h1:document.querySelector('h1')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth+1,violations:(await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id)}));assert.equal(state.overflow,false);assert.deepEqual(state.violations,[]);states.push({label,...state});}
 await scan('online install guide');await context.setOffline(true);await page.goto(base+'/app/settings?offline-smoke=1');await page.getByRole('heading',{name:'Your saved list is still here'}).waitFor();assert.ok(page.url().includes('/app/settings'));await scan('offline protected deep link');await page.goto(base+'/saved');await page.getByText('Offline · saved notes only',{exact:true}).waitFor();await scan('offline saved board');
 await page.goto(base+'/pet-friendly?city=siliguri');await page.getByRole('heading',{name:'Your saved list is still here'}).waitFor();assert.equal(await page.locator('.pet-card').count(),0);assert.equal(await page.locator('.pet-source-links a').count(),0);assert.ok(page.url().includes('/pet-friendly?city=siliguri'));await scan('offline pet-directory safety fallback');
 const cached=await page.evaluate(async()=>{const urls=[];for(const key of await caches.keys())if(key.startsWith('dealmosaic-pwa-'))for(const request of await(await caches.open(key)).keys())urls.push(new URL(request.url).pathname);return urls.sort();});assert.deepEqual(cached,[...release.assets].sort());assert.ok(!cached.some(path=>path.startsWith('/api/')));assert.deepEqual(errors,[]);
 results.push({engine,states,cacheEntries:cached.length,apiCacheEntries:0,installability,errors});
 }finally{await browser.close();}
}
const report={at:new Date().toISOString(),base,release,headers,shopPublicState:shop,results,limits:'Read-only browser engines, not physical Android/iPhone OS installation. No real financial, shipment or notification action.'};writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({build:release.build,engines:results.map(r=>r.engine),states:results.reduce((n,r)=>n+r.states.length,0),output}));
