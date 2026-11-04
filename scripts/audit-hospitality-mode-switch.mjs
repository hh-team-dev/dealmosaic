/** Read-only live rendering diagnostic, not an iQOO hardware certification. No affiliate clicks or bookings. */
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:393,height:851},isMobile:true,hasTouch:true});const page=await context.newPage();const cdp=await context.newCDPSession(page);const results=[];
const desktop='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';
const mobile='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36';
try{
 for(const route of ['/stays','/dining','/pet-friendly']){
  const states=[];
  for(const mode of ['mobile','desktop','mobile-return']){
   const phone=mode!=='desktop';await cdp.send('Network.setUserAgentOverride',{userAgent:phone?mobile:desktop,platform:phone?'Android':'Linux x86_64'});await cdp.send('Emulation.setDeviceMetricsOverride',{width:phone?393:980,height:851,deviceScaleFactor:phone?2:1,mobile:phone});
   const r=await page.goto('https://dealmosaic.pages.dev'+route,{waitUntil:'networkidle',timeout:30000});await page.locator('h1').waitFor();
   states.push({mode,status:r.status(),...await page.evaluate(()=>({url:location.href,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,heading:document.querySelector('h1')?.textContent,invalidRequest:/INVALID REQUEST/.test(document.body.innerText),viewport:document.querySelector('meta[name=viewport]')?.content}))});
  }results.push({route,states});console.log(route,JSON.stringify(states));
 }
 for(const url of ['https://www.cleartrip.com/hotels','https://res.itchotels.com/']){
  const state={url};try{const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});state.status=r.status();state.finalUrl=page.url();state.title=await page.title();state.bodySample=(await page.locator('body').innerText({timeout:5000})).slice(0,700);}catch(e){state.error=e.message.split('\n')[0];}results.push(state);console.log(JSON.stringify(state));
 }
}finally{await browser.close();mkdirSync('/home/user/research/hospitality-revenue-audit',{recursive:true});writeFileSync('/home/user/research/hospitality-revenue-audit/browser-mode-diagnostic.json',JSON.stringify({at:new Date().toISOString(),scope:'Chromium UA/viewport transitions with full navigations; not the physical iQOO Chrome desktop-site toggle, provider session reproduction, coupon redemption or affiliate conversion verification. Direct untracked provider URLs only; screenshots not created.',results},null,2)+'\n');}
