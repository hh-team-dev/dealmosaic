/** Read-only verification: never visits a real /api/go click endpoint, merchant,
 * affiliate destination, account mutation, campaign application or payment flow. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium, webkit } from '@playwright/test';
const origin=process.env.VERIFY_ORIGIN || 'https://dealmosaic.pages.dev';
const expected=JSON.parse(readFileSync('apps/web/dist/pwa-release.json','utf8'));
const report={checkedAt:new Date().toISOString(),origin,scope:'Read-only public/API/browser checks; no external visits or authenticated production writes',checks:[],errors:[],blockedRequests:[]};
function check(name,pass){assert.ok(pass,name);report.checks.push(name);}
async function get(path,headers={}) {return fetch(origin+path,{redirect:'manual',headers:{'cache-control':'no-cache',...headers},signal:AbortSignal.timeout(45000)});}
const health=await(await get('/api/health')).json();report.api={version:health.version,revision:health.revision,environment:health.environment};
check('Expected API version',health.version===expected.version);
const release=await(await get('/pwa-release.json')).json();report.web={version:release.version,build:release.build,mode:release.mode};
check('Expected website/PWA artifact',release.version===expected.version&&release.build===expected.build&&release.mode==='pwa');
check('Owner connection inventory denies anonymous access',(await get('/api/admin/connections')).status===401);
const [response,discoveryResponse]=await Promise.all([get('/api/coupons?limit=250'),get('/api/coupons/discover')]);
const offers=await response.json(),discovery=await discoveryResponse.json();
const publicRows=[...offers.coupons,...discovery.sections.flatMap(s=>s.items)];
const direct=publicRows.filter(row=>row.merchantHomeUrl);
check('Public offers contain direct-store recovery choices',direct.length>0);
check('Direct recovery URLs contain only HTTPS merchant origins',direct.every(row=>{const u=new URL(row.merchantHomeUrl);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.pathname==='/'&&!u.search&&!u.hash&&!/linksredirect|cuelinks/.test(u.hostname);}));
const sample=direct.find(row=>row.code)||direct[0];report.sample={offer:sample.id,store:sample.platformName,merchantHost:new URL(sample.merchantHomeUrl).hostname};
const details=await(await get(`/api/go/${encodeURIComponent(sample.id)}/details`)).json();
check('Read-only recovery matches the published offer',details.available&&details.merchantHomeUrl===sample.merchantHomeUrl&&details.title===sample.title);
const unavailable=await(await get('/api/go/release-check-invalid/details')).json();
check('Unavailable offers expose neither code nor direct destination',!unavailable.available&&!unavailable.code&&!unavailable.merchantHomeUrl);
const missing=await get('/api/go/release-check-invalid',{accept:'text/html'});
check('Pages returns a local 303 rather than following the redirect',missing.status===303&&missing.headers.get('location')==='/store-link-help?offer=release-check-invalid');
for(const path of ['/admin?tab=connections','/store-link-help']) {
 const r=await get(path);check('Private neutral shell: '+path,r.status===200&&/no-store/.test(r.headers.get('cache-control')||'')&&/noindex/.test(r.headers.get('x-robots-tag')||''));
}
for(const [name,engine,width] of [['android-chromium',chromium,393],['webkit-phone',webkit,390]]) {
 const browser=await engine.launch();
 try {
  const context=await browser.newContext({viewport:{width,height:852},serviceWorkers:'block'});
  await context.route('**/*',route=>{
   const request=route.request(),u=new URL(request.url());
   if(u.origin!==origin||!['GET','HEAD'].includes(request.method())||/^\/api\/go\/[^/]+$/.test(u.pathname)) {
    report.blockedRequests.push({host:u.hostname,path:u.pathname,method:request.method()});return route.abort();
   }
   return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(`${name}: ${e.message}`));
  await page.goto(origin+'/',{waitUntil:'networkidle'});
  await page.locator('.store-fallback a[href^="https://"]').first().waitFor();
  check(name+': direct fallback available on homepage before clicking',true);
  check(name+': homepage fits mobile width',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.goto(origin+`/store-link-help?offer=${encodeURIComponent(sample.id)}`,{waitUntil:'networkidle'});
  const directLink=page.getByRole('link',{name:/Open store homepage directly/});await directLink.waitFor();
  check(name+': recovery direct URL agrees with validated API field',await directLink.getAttribute('href')===sample.merchantHomeUrl);
  const tracked=page.getByRole('link',{name:/Try the store link again/});
  check(name+': original sponsored option remains separate',(await tracked.getAttribute('href')).startsWith('/api/go/')&&/sponsored/.test(await tracked.getAttribute('rel')));
  check(name+': recovery fits mobile width',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check(name+': no claim of automatic offer benefits',(await page.locator('body').innerText()).includes('Nothing is applied automatically.'));
  await page.goto(origin+'/admin?tab=connections',{waitUntil:'networkidle'});
  check(name+': private inventory not rendered to a guest',await page.getByRole('heading',{name:'1. APIs & tie-ups'}).count()===0);
 } finally {await browser.close();}
}
check('No browser exceptions',report.errors.length===0);check('No external, affiliate-click or mutation request attempted',report.blockedRequests.length===0);
const target=process.env.VERIFY_REPORT || 'docs/source/2026-11-05-click-repair-production-verification.json';
writeFileSync(target,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checksPassed:report.checks.length,api:report.api,web:report.web,sample:report.sample,errors:report.errors,blockedRequests:report.blockedRequests},null,2));
