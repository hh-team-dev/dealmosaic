/** Read-only browser audit. No clicks that mutate accounts, spend money or send mail.
 * npm run audit:browser -- --base https://dealmosaic.pages.dev --output /tmp/audit.json
 * --all adds every sitemap URL. Results distinguish rendering from interaction coverage.
 */
import { chromium } from 'playwright';
import { readFileSync,writeFileSync } from 'node:fs';
const args=process.argv.slice(2);const option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const base=option('--base','http://127.0.0.1:5173');const output=option('--output','/tmp/dealmosaic-browser-audit.json');
const axe=readFileSync(new URL('../node_modules/axe-core/axe.min.js',import.meta.url),'utf8');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:Number(option('--width','390')),height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
let paths=['/','/stays','/dining','/install','/browse','/deals','/saved','/search','/search?q=iphone','/search?q=unfindable-test-query-742','/how-we-rank','/data-sources','/login','/register','/forgot-password','/reset-password','/verify-email','/privacy','/terms','/disclosure','/contact','/admin','/admin?tab=shop','/handcrafted','/app','/app/settings','/this-page-does-not-exist'];
if(args.includes('--all')){const xml=await (await fetch(base+'/sitemap.xml')).text();paths=[...new Set([...paths,...[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]).pathname)])];}
if(args.includes('--paths-from')) paths=[...new Set([...paths,...JSON.parse(readFileSync(option('--paths-from',''),'utf8')).results.map(p=>p.path)])];
const results=[];
try{
 for(const path of paths){const page=await context.newPage();const errors=[];const failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=500)failed.push({path:new URL(r.url()).pathname,status:r.status()});});
 let result={path};try{const response=await page.goto(base+path,{waitUntil:'networkidle',timeout:35000});await page.locator('h1').first().waitFor({timeout:8000}).catch(()=>{});
 await page.addScriptTag({content:axe});const accessibility=await page.evaluate(async()=>await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
 const dom=await page.evaluate(()=>({title:document.title,h1:[...document.querySelectorAll('h1')].map(x=>x.textContent.trim()),canonical:[...document.querySelectorAll('link[rel="canonical"]')].map(x=>x.href),overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('button')].filter(e=>e.getClientRects().length).map(e=>({name:e.getAttribute('aria-label')||e.innerText.trim(),disabled:e.disabled,width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)})),links:[...document.querySelectorAll('a[href]')].filter(e=>e.getClientRects().length).map(e=>({href:e.getAttribute('href'),name:e.getAttribute('aria-label')||e.innerText.trim()}))}));
 result={...result,status:response.status(),...dom,errors,failed,violations:accessibility.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary})).slice(0,12)}))};
 }catch(e){result.error=e.message;result.errors=errors;}results.push(result);console.log(JSON.stringify({path,status:result.status,overflow:result.overflow,errors:result.errors?.length,violations:result.violations?.map(v=>v.id)}));await page.close();
 }
}finally{await browser.close();writeFileSync(output,JSON.stringify({at:new Date().toISOString(),base,coverage:'Read-only rendering/accessibility; interaction tests are separate.',results},null,2));}
const bad=results.filter(r=>r.error||r.errors?.length||r.failed?.length||r.overflow||r.violations?.length);console.log(`Audited ${results.length} page states; ${bad.length} with findings. Evidence: ${output}`);
