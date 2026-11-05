import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';
let app: any, db: any, classify: any;
const now = new Date().toISOString();
const ownerToken = 'local-owner-connection-fixture';
const userToken = 'local-user-connection-fixture';
beforeAll(async () => {
  const mod = await import('../src/app.js'); await mod.ready; app = mod.app;
  ({ db } = await import('../src/db/index.js'));
  ({ campaignCategory: classify } = await import('../src/routes/admin-connections.js'));
  for (const [id, role, token] of [['connection-owner', 'super_admin', ownerToken], ['connection-user', 'user', userToken]]) {
    await db.prepare('INSERT INTO users(id,email,password_hash,display_name,email_verified_at,role,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(id, `${id}@example.test`, 'not-a-real-password-hash', 'Local fixture', now, role, now, now);
    await db.prepare('INSERT INTO sessions(id,user_id,token_hash,csrf_token,created_at,last_seen_at,expires_at) VALUES(?,?,?,?,?,?,?)').run(id, id, createHash('sha256').update(token!).digest('hex'), 'fixture-csrf', now, now, new Date(Date.now()+86400000).toISOString());
  }
  for (const [id,name,domain,access] of [[55001,'Fixture Grocer','grocer.example.com','open'],[55002,'Fixture Hotels','hotel.example.com','pending'],[2516,'Trivago','trivago.com','open']]) {
    await db.prepare('INSERT INTO affiliate_campaigns(id,name,domain,access_status,campaign_type,synced_at) VALUES(?,?,?,?,?,?)').run(id,name,domain,access,'CPS',now);
  }
  await db.prepare("UPDATE affiliate_campaigns SET categories_json='[\"Groceries\"]', countries_json='[\"IN\"]' WHERE id=55001").run();
  for (const [id,campaign,slug,group,state,expiry] of [
    ['connection-live',55001,'fixture-grocer','grocery','listed',null],
    ['connection-pending',55002,'fixture-hotels','travel','listed',null],
    ['connection-held',55002,'fixture-hotels','travel','rejected',null],
    ['connection-expired',55001,'fixture-grocer','grocery','listed','2000-01-01T00:00:00.000Z'],
    ['connection-unknown',55003,'fixture-unknown','electronics','listed',null],
  ]) {
    const domain=campaign===55002?'hotel.example.com':'grocer.example.com';
    await db.prepare(`INSERT INTO coupons(id,campaign_id,platform_slug,code,title,discount_type,discount_value,source,trust_state,tracking_url,created_at,deal_group,expires_at)
      VALUES(?,?,?,'FIXTURE10','Local fixture only','percent',10,'affiliate',?,?,?,?,?)`).run(id,campaign,slug,state,`https://linksredirect.com/?cid=fixture&url=${encodeURIComponent(`https://${domain}/product?ref=fixture`)}`,now,group,expiry);
  }
});
const request = (path='/api/admin/connections', token=ownerToken) => app.request(path, { headers: token ? { cookie: `dm_session=${token}` } : {} });
describe('owner category-separated inventory', () => {
  it('enforces authentication and the administrator boundary', async () => {
    expect((await request('/api/admin/connections','')).status).toBe(401);
    expect((await request('/api/admin/connections',userToken)).status).toBe(403);
  });
  it('separates open access, published offers and homepage placement without external visits or writes', async () => {
    const before = await db.prepare('SELECT COUNT(*) AS n FROM outbound_clicks').get();
    const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('No upstream requests allowed'));
    try {
      const res=await request(); expect(res.status).toBe(200); expect(res.headers.get('cache-control')).toContain('no-store');
      const data=await res.json();
      expect(data.summary).toMatchObject({ cachedCampaigns:3,open:2,indiaOpen:1,pending:1,unknown:1,publishedCampaigns:3,publishedOfferRows:3,directFallbacks:2,unconfirmedAccessOffers:2 });
      expect(data.rows.find((r:any)=>r.id===55001)).toMatchObject({ category:'grocery',publishedOffers:1,directFallbacks:1 });
      expect(data.rows.find((r:any)=>r.id===55002)).toMatchObject({ category:'hotels',publishedOffers:1,access:'pending' });
      expect(data.rows.find((r:any)=>r.id===2516).warning).toContain('permission unresolved');
      expect(data.services.find((s:any)=>s.name.startsWith('Agoda')).status).toBe('Not connected');
      expect(data.redirectHosts).toEqual([{host:'linksredirect.com',offers:3}]);
      expect(fetcher).not.toHaveBeenCalled();
      expect(await db.prepare('SELECT COUNT(*) AS n FROM outbound_clicks').get()).toEqual(before);
      expect(JSON.stringify(data)).not.toContain(ownerToken);
    } finally { fetcher.mockRestore(); }
  });
  it('filters category/access/publication independently and clamps pagination', async () => {
    const res=await request('/api/admin/connections?category=hotels&access=pending&published=yes&page=999');
    const data=await res.json(); expect(data.total).toBe(1); expect(data.page).toBe(1); expect(data.rows[0].id).toBe(55002);
    const india=await (await request('/api/admin/connections?country=IN')).json(); expect(india.total).toBe(1); expect(india.rows[0].id).toBe(55001);
    const empty=await (await request('/api/admin/connections?category=grocery&q=not-present')).json(); expect(empty.rows).toEqual([]); expect(empty.summary.publishedOfferRows).toBe(3);
  });
  it('keeps uncategorised campaigns separate rather than inventing grocery/hotel coverage', () => {
    expect(classify('Unknown Merchant',[]).id).toBe('other');
    expect(classify('ITC Hotels',[]).id).toBe('hotels');
    expect(classify('Dominos',[]).id).toBe('dining');
    expect(classify('Flight offers',[{platform_slug:'cleartrip-flight',deal_group:'travel'}]).id).toBe('travel');
  });
  it('publishes a validated merchant homepage in offer and recovery reads without click attribution', async () => {
    const before=await db.prepare('SELECT COUNT(*) AS n FROM outbound_clicks').get();
    const details=await (await app.request('/api/go/connection-live/details')).json();
    expect(details.merchantHomeUrl).toBe('https://grocer.example.com/');
    const offers=await (await app.request('/api/coupons?platform=fixture-grocer')).json();
    expect(offers.coupons[0].merchantHomeUrl).toBe('https://grocer.example.com/');
    expect(await db.prepare('SELECT COUNT(*) AS n FROM outbound_clicks').get()).toEqual(before);
    const held=await (await app.request('/api/go/connection-held/details')).json();
    expect(held.available).toBe(false); expect(held.merchantHomeUrl).toBeUndefined();
  });
});

it('campaign sync retains network category/country evidence without joining campaigns', async () => {
  const network=await import('../src/lib/cuelinks.js'); const {syncCampaigns}=await import('../src/services/affiliate-campaigns.js');
  const configured=vi.spyOn(network,'isConfigured').mockReturnValue(true);
  const read=vi.spyOn(network,'fetchCampaigns').mockResolvedValue({ data:[{id:55009,name:'Network fixture',domain:'fixture.example.org',access_status:'open',campaign_type:'CPS',payout_type:null,payout:null,payout_currency:null,cookie_duration:null,deeplink_allowed:false,cashback_publishers_allowed:false,categories:[{name:'Health & Beauty'}],countries:[{iso:'IN',name:'India'}]}],meta:{page:1,per_page:500,total:1,total_pages:1,next_page:null} });
  try {
    const result=await syncCampaigns(1); expect(result.ok).toBe(true); expect(read).toHaveBeenCalledWith(1,500,'CPS');
    expect(await db.prepare('SELECT categories_json,countries_json FROM affiliate_campaigns WHERE id=55009').get()).toMatchObject({categories_json:'["Health & Beauty"]',countries_json:'["IN"]'});
  } finally {configured.mockRestore();read.mockRestore();}
});

it.each([
  ['Groceries','grocery'], ['Restaurants & Food','dining'], ['Food & Beverage','other'], ['Hotels','hotels'],
])('keeps the network category %s in %s without mixing groceries and dining', (label, expected) => {
  expect(classify('Unclassified fixture', [], [label]).id).toBe(expected);
  expect(classify('Multi-category fixture', [], ['Travel','Electronics']).id).toBe('other');
});
