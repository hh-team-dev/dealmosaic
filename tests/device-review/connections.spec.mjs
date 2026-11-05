import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const fixture = JSON.parse(readFileSync('/tmp/dm-audit-fixtures.json', 'utf8'));
const base = 'http://127.0.0.1:5173';
let errors;
test.beforeAll(async ({ request, baseURL }) => {
  if (baseURL !== base) throw new Error('Isolated fixtures only');
  expect((await (await request.get('/api/health')).json()).environment).toBe('test');
});
test.beforeEach(async ({ context, page }, info) => {
  errors=[]; page.on('pageerror', e=>errors.push(e.message));
  await context.setExtraHTTPHeaders({'x-forwarded-for':`198.51.100.${15 + [...info.testId].reduce((n,c)=>n+c.charCodeAt(0),0)%225}`});
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.fulfill({contentType:'text/html',body:'<p>Isolated direct merchant destination. No network visit.</p>'}));
});
test.afterEach(()=>expect(errors).toEqual([]));
async function owner(context, role='super_admin') { await context.addCookies([{name:'dm_session',value:fixture.users[role].token,url:base,httpOnly:true}]); }
async function go(page,path) { await page.goto(path); await page.waitForLoadState('networkidle'); }

test('direct fallback is available before a tracking attempt and does not call the tracking endpoint', async ({page,context})=>{
  let tracked=0;
  await context.route('**/api/go/audit-recovery?*', route=>{tracked++;return route.abort();});
  await go(page,'/deals?platform=fixture-store');
  const link=page.getByRole('link',{name:'Store not opening? Open its homepage'});
  await expect(link).toBeVisible(); await expect(link).toHaveAttribute('href','https://merchant.example.org/');
  await expect(page.getByText('Direct route · offer-specific pricing may differ.')).toBeVisible();
  const popup=page.waitForEvent('popup'); await link.click(); const destination=await popup;
  await expect(destination.locator('body')).toContainText('Isolated direct merchant destination'); await destination.close();
  expect(tracked).toBe(0);
});

test('recovery retains the code and offers separate sponsored and direct routes',async({page})=>{
  await go(page,'/store-link-help?offer=audit-recovery');
  await expect(page.getByText('RECOVER10',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:/Try the store link again/})).toHaveAttribute('href','/api/go/audit-recovery?src=recovery');
  await expect(page.getByRole('link',{name:/Open store homepage directly/})).toHaveAttribute('href','https://merchant.example.org/');
  await expect(page.getByText(/not necessarily the advertised item/)).toBeVisible();
  await expect(page.getByText(/Do not disable browser security/)).toBeVisible();
});

test('saved offers keep the validated direct homepage',async({page})=>{
  await go(page,'/');
  await page.getByRole('button',{name:'Save Isolated recovery offer to your list'}).click();
  await go(page,'/saved');
  await expect(page.getByRole('link',{name:'Store not opening? Open its homepage'})).toHaveAttribute('href','https://merchant.example.org/');
});

test('owner desk separates services, open access and published rows and supports precise filters',async({page,context})=>{
  await owner(context); await go(page,'/admin?tab=connections');
  await expect(page.getByRole('heading',{name:'1. APIs & tie-ups'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'2. Campaign access'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'3. Campaigns with published offers'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Read current network campaigns'})).toHaveAttribute('href','/admin?tab=campaigns&inventory=network');
  await expect(page.getByRole('link',{name:'Read live CPC inventory and its country/event rules'})).toHaveAttribute('href','/admin?tab=campaigns&inventory=network&campaignType=CPC');
  await page.locator('summary').filter({hasText:'Hotels & stays'}).click();
  await expect(page.getByRole('heading',{name:'Agoda hotel inventory / rates'})).toBeVisible();
  await page.getByRole('combobox',{name:'Category',exact:true}).selectOption('products');
  await page.getByRole('combobox',{name:'Access',exact:true}).selectOption('open');
  await page.getByRole('combobox',{name:'Published offers',exact:true}).selectOption('yes');
  await page.getByRole('combobox',{name:'Country evidence',exact:true}).selectOption('IN');
  await page.getByLabel('Campaign, domain or ID').fill('990001');
  await page.getByRole('button',{name:'Search campaigns'}).click();
  await expect(page.getByText('1 matching campaigns · page 1 of 1')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Fixture Store',exact:true})).toBeVisible();
  await expect(page.getByRole('definition').filter({hasText:/^India listed$/})).toBeVisible();
  await expect(page.getByRole('link',{name:'View public offers · no store click'})).toHaveAttribute('href','/deals?platform=fixture-store');
});

test('a regular account cannot read owner connection inventory',async({page,context})=>{
  await owner(context,'user'); await go(page,'/admin?tab=connections');
  const response=await page.request.get('/api/admin/connections'); expect(response.status()).toBe(403);
  await expect(page.getByRole('heading',{name:'1. APIs & tie-ups'})).toHaveCount(0);
});

test('owner inventory failure offers a working retry instead of false zeroes',async({page,context})=>{
  await owner(context); let fail=true;
  await page.route('**/api/admin/connections?*',route=>fail?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'unavailable',message:'Inventory unavailable in this isolated test.'}})}):route.continue());
  await go(page,'/admin?tab=connections');
  await expect(page.getByRole('alert')).toContainText('Inventory unavailable');
  await expect(page.getByRole('heading',{name:'2. Campaign access'})).toHaveCount(0);
  fail=false;await page.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(page.getByRole('heading',{name:'2. Campaign access'})).toBeVisible();
});

test('connection desk and recovery fit a 320px phone without horizontal clipping',async({page,context})=>{
  await page.setViewportSize({width:320,height:740});await owner(context);
  for(const path of ['/admin?tab=connections','/store-link-help?offer=audit-recovery','/deals?platform=fixture-store']) {
    await go(page,path);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
});
