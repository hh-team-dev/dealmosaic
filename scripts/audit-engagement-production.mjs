/** Read-only live check: no installs, orders, sign-ins, payments or notifications. */
import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const base=process.argv[2]||'https://dealmosaic.pages.dev';
const output=process.argv[3]||'/tmp/dm-engagement-production.json';
const paths=['/','/stays','/dining','/deals','/saved','/browse','/search?q=rice','/privacy','/login','/register','/install','/admin?tab=shop','/handcrafted','/this-page-does-not-exist'];
const results=[];
for(const [name,type,viewport]of [['chromium-320',chromium,{width:320,height:740}],['chromium-desktop',chromium,{width:1365,height:900}],['webkit-390',webkit,{width:390,height:844}]]){
 const browser=await type.launch();const context=await browser.newContext({viewport});const page=await context.newPage();
 try{for(const path of paths){const errors=[];const onError=error=>errors.push(error.message);page.on('pageerror',onError);const response=await page.goto(base+path,{waitUntil:'networkidle'});
 await page.locator('.engagement-bar').waitFor({state:'visible',timeout:15000});
 const top=await page.evaluate(()=>{const bars=document.querySelectorAll('.engagement-bar');const bar=bars[0];const rect=bar?.getBoundingClientRect();return {bars:bars.length,tickers:document.querySelectorAll('.ticker').length,y:rect?.y,height:rect?.height,install:bar?.querySelector('.engagement-install-button')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth+1};});
 assert.equal(top.bars,1);assert.equal(top.tickers,1);assert.equal(top.y,0);assert.ok(top.height<=125);assert.equal(top.overflow,false);assert.ok(top.install.includes('Install app'));
 await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));const bottom=await page.evaluate(()=>({y:document.querySelector('.engagement-bar').getBoundingClientRect().y,tickerY:document.querySelector('.ticker').getBoundingClientRect().y,overflow:document.documentElement.scrollWidth>innerWidth+1}));assert.equal(bottom.y,0);assert.equal(bottom.overflow,false);assert.deepEqual(errors,[]);
 page.off('pageerror',onError);results.push({engine:name,path,status:response.status(),top,bottom,errors});console.log(name,path,'fixed at both scroll positions');}
 }finally{await browser.close();}
}
writeFileSync(output,JSON.stringify({at:new Date().toISOString(),base,coverage:`${results.length} read-only live viewport/route states, each checked at top and bottom; not physical-device certification.`,results},null,2)+'\n');
console.log(`${results.length} live persistent-bar states passed; no screenshot or production mutation.`);
