/** Read-only public pet directory audit. No provider visits, messages, reservations or payments. */
import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const base=process.argv[2]||'https://dealmosaic.pages.dev',output=process.argv[3]||'/tmp/dm-pets-production.json';
const release=JSON.parse(readFileSync('apps/web/dist/pwa-release.json'));
assert.equal((await(await fetch(base+'/pwa-release.json',{cache:'no-store'})).json()).build,release.build);
const cities=JSON.parse(readFileSync('apps/web/src/data/hospitality-cities.json')),venues=JSON.parse(readFileSync('apps/web/src/data/pet-venues.json')).filter(v=>v.status==='listed');
const axe=readFileSync('node_modules/axe-core/axe.min.js','utf8'),results=[];
const csvResponse=await fetch(base+'/pet-friendly-directory.csv');assert.equal(csvResponse.status,200);const csv=await csvResponse.text();assert.equal(csv.split('\r\n').filter(Boolean).length,venues.length+1);
for(const [engine,type,viewport]of [['chromium-320',chromium,{width:320,height:740}],['chromium-desktop',chromium,{width:1365,height:900}],['webkit-390',webkit,{width:390,height:844}]]){
 const browser=await type.launch(),context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage();const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!==base)external.push(r.url());});
 try{
  const r=await page.goto(base+'/pet-friendly',{waitUntil:'networkidle'});assert.equal(r.status(),200);await page.locator('.pet-card').first().waitFor();assert.equal(await page.locator('.pet-card').count(),venues.length);assert.equal(await page.getByRole('heading',{level:1}).count(),1);assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),base+'/pet-friendly');assert.equal(await page.getByRole('navigation',{name:'Explore DealMosaic'}).count(),1);
  assert.ok((await page.locator('.pet-trust').innerText()).includes('Not an exhaustive list'));
  await page.addScriptTag({content:axe});const violations=await page.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));assert.deepEqual(violations,[]);
  const selections=[];
  for(const city of cities){await page.getByRole('combobox',{name:'Pet destination',exact:true}).selectOption(city.id);for(const kind of ['hotel','restaurant']){await page.getByRole('combobox',{name:'Place type',exact:true}).selectOption(kind);const expected=venues.filter(v=>v.kind===kind&&(v.city===city.id||(city.id==='delhi-ncr'&&['gurugram','noida'].includes(v.city)))).map(v=>v.id).sort();
   await page.waitForFunction(ids=>JSON.stringify([...document.querySelectorAll('.pet-card')].map(x=>x.dataset.venueId).sort())===JSON.stringify(ids),expected);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);selections.push({city:city.id,kind,count:expected.length});
  }}
  const sources=await page.locator('.pet-directory a[target=_blank]').evaluateAll(a=>a.map(x=>({url:x.href,rel:x.rel})));for(const s of sources){assert.ok(s.url.startsWith('https://'));assert.equal(s.rel,'noopener noreferrer');}
  for(const end of ['top','bottom']){await page.evaluate(bottom=>scrollTo(0,bottom?document.documentElement.scrollHeight:0),end==='bottom');assert.equal(await page.locator('.engagement-bar').evaluate(e=>e.getBoundingClientRect().top),0);const rect=await page.locator('.explore-dock').boundingBox();assert.ok(rect.y+rect.height<=viewport.height+1);}
  await context.setOffline(true);await page.locator('.pet-trust').getByText('Offline: reference information only.',{exact:false}).waitFor();assert.equal(await page.locator('.pet-source-links a').count(),0);assert.equal(await page.locator('.pet-offer-panel a').count(),0);await context.setOffline(false);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);results.push({engine,status:r.status(),entries:venues.length,selections,violations,errors,automaticExternalRequests:external,offlineActionsDisabled:true});console.log(engine,'pet directory passed, all destinations/types, citations, offline and accessibility');
 }finally{await browser.close();}
}
writeFileSync(output,JSON.stringify({at:new Date().toISOString(),base,build:release.build,sourceEntries:venues.length,csvRows:venues.length,results,limits:'Read-only browser checks, not physical-device, venue-policy, booking, offer-redemption or comprehensive-inventory certification.'},null,2)+'\n');
