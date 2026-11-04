/** Read-only live hospitality audit. Never follows affiliate links or submits a booking/order. */
import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const base=process.argv[2]||'https://dealmosaic.pages.dev';
const output=process.argv[3]||'/tmp/dm-hospitality-production.json';
const expected=JSON.parse(readFileSync('apps/web/dist/pwa-release.json','utf8'));
assert.equal((await(await fetch(base+'/pwa-release.json',{cache:'no-store'})).json()).build,expected.build);
const cities=JSON.parse(readFileSync('apps/web/src/data/hospitality-cities.json','utf8'));
const axe=readFileSync('node_modules/axe-core/axe.min.js','utf8');const results=[];
for(const [engine,type,viewport]of [['chromium-320',chromium,{width:320,height:740}],['chromium-desktop',chromium,{width:1365,height:900}],['webkit-390',webkit,{width:390,height:844}]]){
 const browser=await type.launch();const context=await browser.newContext({viewport,reducedMotion:'reduce'});const page=await context.newPage();
 try{for(const route of ['stays','dining']){const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
  const response=await page.goto(`${base}/${route}?city=jaipur`,{waitUntil:'networkidle'});assert.equal(response.status(),200);await page.locator('.hospitality').waitFor();
  assert.equal(await page.getByLabel('City region').inputValue(),'jaipur');assert.equal(await page.getByRole('heading',{level:1}).count(),1);assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),base+'/'+route);
  const states=[];for(const position of ['top','bottom']){await page.evaluate(bottom=>scrollTo(0,bottom?document.documentElement.scrollHeight:0),position==='bottom');
   const state=await page.evaluate(()=>{const docks=[...document.querySelectorAll('.explore-dock')];const dock=docks[0];const r=dock.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth+1,docks:docks.length,legacyBars:document.querySelectorAll('.bottom-nav').length,barTop:document.querySelector('.engagement-bar').getBoundingClientRect().top,dockBottom:r.bottom,viewportHeight:innerHeight,links:[...dock.querySelectorAll('a')].map(a=>({text:a.textContent.trim(),href:a.getAttribute('href'),active:a.getAttribute('aria-current'),width:a.getBoundingClientRect().width,height:a.getBoundingClientRect().height}))};});
   assert.equal(state.overflow,false);assert.equal(state.docks,1);assert.equal(state.legacyBars,0);assert.equal(state.barTop,0);assert.ok(state.dockBottom<=state.viewportHeight+1);assert.deepEqual(state.links.map(l=>l.text),['Shop','Hotels','Dining','Deals','Saved']);for(const l of state.links){assert.ok(l.width>=44);assert.ok(l.height>=44);}assert.equal(state.links.find(l=>l.text===(route==='stays'?'Hotels':'Dining')).active,'page');states.push({position,...state});
  }
  assert.equal(await page.getByLabel('City region').locator('option').count(),cities.length);
  const cityChecks=[];
  for(const city of cities){await page.getByLabel('City region').selectOption(city.id);
   if(route==='dining'){
    // selectOption dispatches the native change before React's route transition commits in WebKit.
    // Require the exact final query for every link; do not certify the previous city's render.
    await page.waitForFunction(destination=>{const links=[...document.querySelectorAll('.hospitality-local-grid a')];return links.length===4&&links.every(a=>new URL(a.href).searchParams.get('query').endsWith(destination));},city.id==='delhi-ncr'?'Delhi NCR, India':city.query);
    assert.equal(await page.locator('.hospitality-brand-card').count(),9);
    const local=await page.locator('.hospitality-local-grid a').evaluateAll(links=>links.map(a=>a.href));assert.equal(local.length,4);
    for(const href of local){const u=new URL(href);assert.equal(u.origin,'https://www.google.com');assert.equal(u.searchParams.get('api'),'1');assert.ok(u.searchParams.get('query').endsWith(city.id==='delhi-ncr'?'Delhi NCR, India':city.query));}
    const chains=await page.locator('.hospitality-brand-card a.hospitality-secondary').evaluateAll(links=>links.map(a=>a.href));assert.equal(chains.length,9);for(const href of chains)assert.ok(new URL(href).searchParams.get('query').endsWith(city.id==='delhi-ncr'?'Delhi NCR, India':city.query));
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);cityChecks.push(city.id);
  }
  const offers=await page.locator('.hospitality-offer').count();for(const card of await page.locator('.hospitality-offer').all()){assert.ok((await card.innerText()).includes('Not checkout-tested'));assert.ok((await card.locator('a').getAttribute('rel')).includes('sponsored'));}
  await page.addScriptTag({content:axe});const violations=await page.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));assert.deepEqual(violations,[]);assert.deepEqual(errors,[]);
  const sources=await page.locator('.hospitality a[target=_blank]').evaluateAll(links=>links.map(a=>({href:a.getAttribute('href'),rel:a.rel})));for(const source of sources){assert.ok(source.href.startsWith('https://')||source.href.startsWith('/api/go/'));assert.ok(source.rel.includes('noopener'));assert.ok(source.rel.includes('noreferrer'));}
  results.push({engine,route,cityChecks,status:response.status(),offers,states,violations,errors,sources});page.off('pageerror',onError);console.log(engine,route,'passed: dock, city context, source links, truthful offers, geometry and accessibility');
 }}finally{await browser.close();}
}
writeFileSync(output,JSON.stringify({at:new Date().toISOString(),base,build:expected.build,coverage:'Six live route/viewport states, each at top and bottom, plus all 17 selections on each route and city-specific local/chain map query checks. Real browser engines, not physical devices. No provider/affiliate navigation, sign-in, booking, order, payment, message or notification.',results},null,2)+'\n');
