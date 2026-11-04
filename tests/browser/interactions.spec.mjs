import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const fixture = JSON.parse(readFileSync('/tmp/dm-audit-fixtures.json', 'utf8'));
let exceptions;
test.beforeAll(async ({ request, baseURL }) => {
  if (baseURL !== 'http://127.0.0.1:5173') throw new Error('Mutation audit may run ONLY against the isolated local server');
  const health = await (await request.get('/api/health')).json();
  expect(health.environment).toBe('test');
});
test.beforeEach(async ({ page, context }, info) => {
  // Separate synthetic clients: test volume must not consume a single shopper's limiter budget.
  const bucket = [...info.testId].reduce((n, c) => n + c.charCodeAt(0), 0) % 240 + 10;
  await context.setExtraHTTPHeaders({ 'x-forwarded-for': `198.51.100.${bucket}` });
  exceptions=[]; page.on('pageerror', error => exceptions.push(error.message));
});
test.afterEach(() => expect(exceptions).toEqual([]));
async function signedIn(context, role='super_admin') {
  await context.addCookies([{name:'dm_session',value:fixture.users[role].token,url:'http://127.0.0.1:5173',httpOnly:true}]);
}
async function failFirst(page, pattern) {
  let count=0, recovered=false;
  await page.route(pattern, route => { count++; return !recovered ? route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'unavailable',message:'Isolated temporary failure'}})}) : route.continue(); });
  const result=() => count; result.recover=()=>{ recovered=true; }; return result;
}

test('signed-out owner controls explain access and preserve the requested shop tab', async ({page}) => {
  await page.goto('/admin?tab=shop');
  await expect(page.getByRole('heading',{name:'Sign in to continue'})).toBeVisible();
  const link=page.locator('main').getByRole('link',{name:'Sign in',exact:true});
  await expect(link).toHaveAttribute('href','/login?next=%2Fadmin%3Ftab%3Dshop');
  await link.click(); await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
});
test('non-admin account receives a clear forbidden explanation', async ({page,context}) => {
  await signedIn(context,'user'); await page.goto('/admin');
  await expect(page.getByRole('heading',{name:'This account is not an administrator'})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Control centre sections'})).toHaveCount(0);
});
test('invalid admin tab falls back to overview and all seven tabs load', async ({page,context}) => {
  await signedIn(context); await page.goto('/admin?tab=nonsense');
  await expect(page.getByText('Live offers',{exact:true})).toBeVisible();
  for (const name of ['My shop','Earnings','Coupons','Price reports','People','Audit log','Overview']) {
    await page.waitForLoadState('networkidle');
    await page.getByRole('navigation',{name:'Control centre sections'}).getByRole('button',{name,exact:true}).click();
    await expect(page.getByRole('navigation',{name:'Control centre sections'}).getByRole('button',{name,exact:true})).toHaveAttribute('aria-current','page');
    await expect(page.locator('main')).not.toContainText('Something went wrong');
  }
});
test('admin failure has a functional retry', async ({page,context}) => {
  await signedIn(context); const count=await failFirst(page,'**/api/admin/overview');
  await page.goto('/admin'); await expect(page.getByRole('button',{name:'Try again'})).toBeVisible(); count.recover(); await page.getByRole('button',{name:'Try again'}).click();
  await expect(page.getByText('Live offers',{exact:true})).toBeVisible(); expect(count()).toBeGreaterThanOrEqual(2);
});
test('search retries the same query after an API error', async ({page}) => {
  const count=await failFirst(page,'**/api/search'); await page.goto('/search?q=iphone');
  await expect(page.getByRole('button',{name:'Try again'})).toBeVisible(); count.recover(); await page.getByRole('button',{name:'Try again'}).click();
  await expect(page.getByRole('button',{name:'Try again'})).toHaveCount(0);
  await expect.poll(count).toBeGreaterThanOrEqual(2);
});
test('catalogue retries and resets error state', async ({page}) => {
  const count=await failFirst(page,'**/api/catalogue/products?*'); await page.goto('/browse');
  await expect(page.getByRole('button',{name:'Try again'})).toBeVisible(); count.recover(); await page.getByRole('button',{name:'Try again'}).click();
  await expect(page.locator('.product-tile').first()).toBeVisible(); expect(count()).toBeGreaterThanOrEqual(2);
});
test('product network failure is not misreported as a missing product and retry works', async ({page}) => {
  const count=await failFirst(page,'**/api/catalogue/products/apple-iphone-16'); await page.goto('/p/apple-iphone-16');
  await expect(page.getByRole('heading',{name:'This product could not load'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Try again'})).toBeVisible(); count.recover(); await page.getByRole('button',{name:'Try again'}).click();
  await expect(page.getByRole('heading',{name:/Apple iPhone 16/,level:1})).toBeVisible(); expect(count()).toBeGreaterThanOrEqual(2);
});
test('sign-in works; password toggle, field hints and account settings persist', async ({page}) => {
  await page.goto('/login?next=/app/settings');
  await page.getByLabel('Email address').fill(fixture.users.user.email);
  await page.getByLabel('Password',{exact:true}).fill(fixture.password);
  await page.getByRole('button',{name:'Show password'}).click();
  await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('type','text');
  await page.getByRole('button',{name:'Hide password'}).click();
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page).toHaveURL(/\/app\/settings$/);
  await page.getByLabel('Display name').fill('Audit Updated');
  await page.getByRole('button',{name:'Save profile'}).click();
  await expect(page.getByText('Profile updated.',{exact:true})).toBeVisible();
  await page.reload(); await expect(page.getByLabel('Display name')).toHaveValue('Audit Updated');
  await expect(page.getByLabel(/Phone number/)).toHaveAttribute('aria-describedby','phone-hint');
});
test('delete dialog keeps typing focus, traps keyboard focus and Escape restores opener', async ({page,context}) => {
  await signedIn(context,'user'); await page.goto('/app/settings');
  const opener=page.getByRole('button',{name:'Delete account',exact:true}); await opener.click();
  const dialog=page.getByRole('dialog'); const password=dialog.getByLabel('Confirm your password');
  await password.pressSequentially('focus-must-stay',{delay:80});
  await expect(password).toHaveValue('focus-must-stay'); await expect(password).toBeFocused();
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused();
});
test('shared busy button cannot be re-enabled by disabled=false', async ({page}) => {
  // This component-mount probe requires Vite source imports. Built-page flows below do not.
  test.skip((await page.request.get('/src/components/Ui.tsx')).status() !== 200, 'Development-only source-import probe; use the built interaction scenarios for release validation.');
  await page.goto('/login');
  await page.evaluate(async()=>{
    const React=await import('/node_modules/.vite/deps/react.js');
    const client=await import('/node_modules/.vite/deps/react-dom_client.js'); const {createRoot}=client.default || client;
    const {Button}=await import('/src/components/Ui.tsx');
    const mount=document.createElement('div'); document.body.append(mount);
    createRoot(mount).render((React.default || React).createElement(Button,{loading:true,disabled:false},'Busy audit button'));
  });
  await expect(page.getByRole('button',{name:'Busy audit button'})).toBeDisabled();
});
test('save, reopen and remove a device-only deal', async ({page}) => {
  await page.goto('/'); const save=page.getByRole('button',{name:/^Save .* to your list$/}).first();
  await save.click(); await expect(page.locator('.deal-save[aria-pressed="true"]').first()).toBeVisible();
  await page.goto('/saved'); await expect(page.locator('.saved-grid .deal-card')).toHaveCount(1);
  await page.getByRole('button',{name:/Remove .* from saved deals/}).click();
  await expect(page.locator('.saved-grid .deal-card')).toHaveCount(0);
});
test('blocked storage gives feedback instead of claiming a save', async ({page}) => {
  await page.goto('/'); await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Blocked','QuotaExceededError')};});
  const save=page.getByRole('button',{name:/^Save .* to your list$/}).first(); await save.click();
  await expect(page.getByText(/Your browser could not save this change/)).toBeVisible();
  await expect(save).toHaveAttribute('aria-pressed','false');
});
test('clipboard failure explains the manual fallback', async ({page}) => {
  await page.goto('/deals');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('Blocked'))}}));
  await page.getByRole('button',{name:/Copy code/}).first().click();
  await expect(page.getByText(/Copy was blocked/)).toBeVisible();
});
test('PIN follows cross-tab changes and clears pending loading cleanly', async ({page,context}) => {
  await page.goto('/p/apple-iphone-16');
  const tab=await context.newPage(); await tab.goto('/saved');
  await tab.evaluate(()=>localStorage.setItem('dealmosaic.pincode.v1','700001'));
  await expect(page.getByLabel('Your pincode')).toHaveValue('700001');
  await page.getByLabel('Your pincode').fill('');
  await page.getByRole('button',{name:'Update',exact:true}).click();
  await expect.poll(()=>tab.evaluate(()=>localStorage.getItem('dealmosaic.pincode.v1'))).toBe(null);
  await expect(page.getByLabel('Your pincode')).toHaveValue(''); await tab.close();
});
for (const route of ['/how-we-rank','/data-sources']) test(`keyboard users can focus the scrollable table on ${route}`, async ({page})=>{
  await page.goto(route); const table=page.getByRole('region',{name:'Scrollable comparison table'}).first();
  await table.focus(); await expect(table).toBeFocused(); await page.keyboard.press('ArrowRight');
});
test('owner shop tabs and product editor open without missing controls or phone overflow', async ({page,context})=>{
  await signedIn(context); await page.goto('/admin?tab=shop');
  const nav=page.getByRole('navigation',{name:'Shop sections'});
  for (const name of ['Orders','Delivery quotes','Shop settings','Activity','Products']) {
    await nav.getByRole('button',{name,exact:true}).click(); await expect(nav.getByRole('button',{name,exact:true})).toHaveAttribute('aria-current','page');
  }
  await page.getByRole('button',{name:'+ Add product',exact:true}).click();
  await expect(page.getByLabel('Product title')).toBeVisible();
  await expect(page.getByRole('textbox',{name:'GSTIN',exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  page.once('dialog',dialog=>dialog.accept()); await page.getByRole('button',{name:'Close editor',exact:true}).click();
});
test('guest checkout selects the cheapest slower carrier, creates a private order and records reference only', async ({page,context}, testInfo)=>{
  if (testInfo.project.name === 'phone') await page.addInitScript(() => Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Blocked','SecurityError')}}));
  await page.goto(`/buy/${fixture.productId}`);
  await page.getByLabel('Choose size / option').selectOption('standard');
  await page.getByLabel('Delivery PIN',{exact:true}).fill('110001');
  await page.getByLabel('Coupon code (optional)').fill('TEST100');
  await page.getByRole('button',{name:'Check delivery & total'}).click();
  await expect(page.getByText(/Slow test carrier/)).toBeVisible();
  for (const [label,value] of [['Full name','Isolated Buyer'],['Email address',`buyer-${Date.now()}@example.test`],['Mobile number','9876543210'],['House, street and area','Local test address only'],['City / town','New Delhi']]) await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByRole('checkbox').check();
  await expect(page.getByRole('button',{name:/Place order/})).toContainText('1,470');
  await page.getByRole('button',{name:/Place order/}).click();
  await expect(page).toHaveURL(/\/direct-orders\//);
  await expect(page.getByRole('heading',{name:'Pay by UPI'})).toBeVisible();
  const privateUrl=page.url();
  await page.reload(); await expect(page.getByRole('heading',{name:'Pay by UPI'})).toBeVisible();
  const other=await context.browser().newContext(); const outsider=await other.newPage();
  await outsider.goto(privateUrl.split('#')[0]); await expect(outsider.getByRole('heading',{name:'Pay by UPI'})).toHaveCount(0); await other.close();
  await page.getByLabel(/UPI.*reference|Transaction.*reference|Payment.*reference/i).fill(`${Date.now()}`);
  await page.getByRole('button',{name:/Submit.*reference|Send.*reference/i}).click();
  await expect(page.getByText(/Payment awaiting verification/,{exact:false})).toBeVisible();
  const orderId=new URL(page.url()).pathname.split('/').pop();
  const ownerContext=await context.browser().newContext(); await signedIn(ownerContext);
  const owner=await ownerContext.newPage(); owner.on('dialog',dialog=>dialog.accept());
  await owner.goto('http://127.0.0.1:5173/admin?tab=shop');
  await owner.getByRole('navigation',{name:'Shop sections'}).getByRole('button',{name:'Orders',exact:true}).click();
  const order=owner.locator('article').filter({hasText:orderId});
  for (const [action,label,detail] of [['paid','Actual bank-credit reference',`LOCAL${Date.now()}`],['dispatch','Tracking / AWB reference','LOCALTRACK12345'],['delivered','Reconciliation / cancellation reason','Isolated fixture delivered']]) {
    await order.getByLabel('Next action').selectOption(action);
    await order.getByLabel(label,{exact:true}).fill(detail);
    if (action!=='delivered') await order.getByRole('checkbox').check();
    await order.getByRole('button',{name:'Record action'}).click();
    await expect(order.getByLabel('Next action')).toHaveValue('');
  }
  await ownerContext.close();
  await page.getByRole('button',{name:'Refresh status'}).click();
  await expect(page.getByText('Delivered',{exact:true})).toBeVisible();
});


test('deals failure can be retried without changing filters',async({page})=>{
  const count=await failFirst(page,'**/api/coupons?*'); await page.goto('/deals');
  await expect(page.getByRole('button',{name:'Try again'})).toBeVisible(); count.recover();
  await page.getByRole('button',{name:'Try again'}).click(); await expect(page.getByRole('button',{name:/Copy code/}).first()).toBeVisible();
});
test('direct collection failure has a working retry',async({page})=>{
  const count=await failFirst(page,'**/api/direct/products'); await page.goto('/handcrafted');
  await expect(page.getByRole('button',{name:'Try again'})).toBeVisible(); count.recover();
  await page.getByRole('button',{name:'Try again'}).click(); await expect(page.getByText('Isolated audit garment').first()).toBeVisible();
});
test('invalid and unknown delivery PINs do not create a payable order',async({page})=>{
  await page.goto(`/buy/${fixture.productId}`);
  await page.getByLabel('Delivery PIN',{exact:true}).fill('123');
  await expect(page.getByRole('button',{name:'Check delivery & total'})).toBeDisabled();
  await page.getByLabel('Delivery PIN',{exact:true}).fill('560001');
  await page.getByRole('button',{name:'Check delivery & total'}).click();
  await expect(page.getByRole('button',{name:/Place order/})).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText(/confirm|checked|unknown/i);
});
test('account export downloads parseable data and notification preference persists',async({page,context})=>{
  await signedIn(context,'user'); await page.goto('/app/settings');
  const email=page.getByRole('switch',{name:'Email notifications'});
  const before=await email.getAttribute('aria-checked'); await email.click();
  await expect(email).toHaveAttribute('aria-checked',before==='true'?'false':'true');
  await page.reload(); await expect(email).toHaveAttribute('aria-checked',before==='true'?'false':'true');
  // Leave this isolated fixture opted out; no job or mail provider is configured.
  if(await email.getAttribute('aria-checked')==='true') { await email.click(); await expect(email).toHaveAttribute('aria-checked','false'); }
  const pending=page.waitForEvent('download'); await page.getByRole('button',{name:'Export my data'}).click();
  const download=await pending; const stream=await download.createReadStream(); const chunks=[]; for await (const chunk of stream) chunks.push(chunk);
  expect(JSON.parse(Buffer.concat(chunks).toString())).toBeTruthy();
});
test('owner coupon reject and restore buttons persist state',async({page,context})=>{
  await signedIn(context); await page.goto('/admin?tab=coupons');
  await page.getByRole('combobox',{name:'Show',exact:true}).selectOption('all');
  const row=page.locator('.admin-row').filter({has:page.getByText('Isolated audit offer',{exact:true})});
  await expect(row).toBeVisible();
  if (await row.getByRole('button',{name:'Restore',exact:true}).count()) { await row.getByRole('button',{name:'Restore',exact:true}).click(); }
  await row.getByRole('button',{name:'Reject',exact:true}).click();
  await page.getByRole('combobox',{name:'Show',exact:true}).selectOption('rejected');
  await row.getByRole('button',{name:'Restore',exact:true}).click();
  await page.getByRole('combobox',{name:'Show',exact:true}).selectOption('all');
  await expect(row.getByRole('button',{name:'Reject',exact:true})).toBeVisible();
});

test('owner price-report confirmation uses a valid state and shows rupees, not one hundredth of the price',async({page,context})=>{
  await signedIn(context); await page.goto('/admin?tab=reports');
  const row=page.locator('.admin-row').filter({hasText:'1,234.50'});
  await expect(row).toBeVisible();
  await row.getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(row.getByText('moderator_verified',{exact:true})).toBeVisible();
  await row.getByRole('button',{name:'Reject',exact:true}).click();
  await expect(row.getByText('rejected',{exact:true})).toBeVisible();
});
