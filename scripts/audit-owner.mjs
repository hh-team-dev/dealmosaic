/** Read-only rendering checks of authenticated/local fixture states. Never production. */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const base='http://127.0.0.1:5173';
if ((await (await fetch(base+'/api/health')).json()).environment!=='test') throw new Error('Owner audit requires isolated test mode');
const fixture=JSON.parse(readFileSync('/tmp/dm-audit-fixtures.json','utf8'));
const axe=readFileSync(new URL('../node_modules/axe-core/axe.min.js',import.meta.url),'utf8');
const browser=await chromium.launch(); const results=[];
try {
 for (const width of [320,390,1365]) {
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',extraHTTPHeaders:{'x-forwarded-for':`198.18.0.${width%200+10}`} });
  await context.addCookies([{name:'dm_session',value:fixture.users.super_admin.token,url:base,httpOnly:true}]);
  const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  async function check(state) {
   await page.addScriptTag({content:axe});
   const violations=await page.evaluate(async()=> (await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   const result={state,width,overflow,errors:[...errors],violations}; results.push(result); console.log(JSON.stringify(result));
  }
  for(const tab of ['overview','revenue','coupons','reports','people','audit']) { await page.goto(`${base}/admin?tab=${tab}`,{waitUntil:'networkidle'}); await check(`admin:${tab}`); }
  await page.goto(base+'/admin?tab=shop',{waitUntil:'networkidle'});
  for(const name of ['Products','Orders','Delivery quotes','Shop settings','Activity']) {await page.getByRole('navigation',{name:'Shop sections'}).getByRole('button',{name,exact:true}).click(); await check(`shop:${name}`);}
  await page.getByRole('navigation',{name:'Shop sections'}).getByRole('button',{name:'Products',exact:true}).click();
  await page.getByRole('button',{name:'+ Add product',exact:true}).click(); await check('shop:product-editor');
  await page.goto(base+'/app/settings',{waitUntil:'networkidle'}); await check('account:settings');
  await page.getByRole('button',{name:'Delete account',exact:true}).click(); await check('account:delete-dialog');
  await page.goto(base+'/buy/'+fixture.productId,{waitUntil:'networkidle'}); await check('shop:buyer-product');
  await context.close();
 }
} finally { await browser.close(); writeFileSync('/tmp/dm-owner-audit.json',JSON.stringify({at:new Date().toISOString(),coverage:'Isolated authenticated rendering/accessibility, not mutation coverage',results},null,2)); }
const bad=results.filter(r=>r.overflow||r.errors.length||r.violations.length);console.log(`${results.length} authenticated/fixture states; ${bad.length} with findings`);if(bad.length)process.exitCode=1;
