/** Isolated browser fixtures. Refuses remote databases and all non-test execution. */
import { writeFileSync } from 'node:fs';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
async function main() {
if (process.env.NODE_ENV !== 'test' || process.env.DB_PATH !== '/tmp/dm-site-audit.db' || process.env.TURSO_DATABASE_URL) throw new Error('Fixtures require the isolated local test DB');
const { ready } = await import('../apps/api/src/app.js'); await ready;
const { db, client } = await import('../apps/api/src/db/index.js');
const { hashPassword } = await import('../apps/api/src/lib/security.js');
const { EMPTY_SHOP, parcelKey } = await import('@dealmosaic/core');
const shop = await import('../apps/api/src/services/direct-shop.js');
const now = new Date().toISOString();
const password = 'Isolated-audit-passphrase-42!';
const users: Record<string, {id: string; token: string; email: string}> = {};
for (const role of ['super_admin', 'user']) {
  const id = randomUUID(), token = randomBytes(32).toString('hex'), email = `${role}-${id}@example.test`;
  await db.prepare('INSERT INTO users(id,email,password_hash,display_name,email_verified_at,role,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(id,email,await hashPassword(password),'Isolated Audit',now,role,now,now);
  await db.prepare('INSERT INTO user_preferences(user_id,notify_email,created_at,updated_at) VALUES(?,0,?,?)').run(id,now,now);
  await db.prepare('INSERT INTO sessions(id,user_id,token_hash,csrf_token,created_at,last_seen_at,expires_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(),id,createHash('sha256').update(token).digest('hex'),randomBytes(16).toString('hex'),now,now,new Date(Date.now()+86400000).toISOString());
  users[role]={id,token,email};
}
await db.prepare(`INSERT OR REPLACE INTO coupons(id, platform_slug,code,title,discount_type,discount_value,source,trust_state,tracking_url,created_at) VALUES('audit-coupon','croma','AUDIT10','Isolated audit offer','percent',10,'affiliate','listed','https://example.test/offer',?)`).run(now);
for (let i=1;i<=5;i++) {
 await db.prepare(`INSERT OR REPLACE INTO coupons(id,platform_slug,code,title,discount_type,discount_value,source,trust_state,tracking_url,created_at,stated_percent,deal_group,expires_at) VALUES(?,?,?,?, 'percent',10,'affiliate','listed','https://example.test/offer',?,10,'electronics',?)`).run(`audit-coupon-${i}`,'croma',`AUDIT${i}`,`Isolated audit offer ${i}`,now,new Date(Date.now()+86400000).toISOString());
}
const reportVariant = await db.prepare('SELECT id FROM product_variants LIMIT 1').get();
await db.prepare("INSERT OR REPLACE INTO community_prices(id,variant_id,platform_slug,pincode,price_minor,reported_at) VALUES('audit-community',?,'croma','700001',123450,?)").run(String(reportVariant!.id),now);
await db.prepare('INSERT OR REPLACE INTO direct_settings(id,data,version) VALUES(1,?,1)').run(JSON.stringify({...EMPTY_SHOP,enabled:true,sellerName:'Isolated seller',sellerAddress:'Test-only address',supportEmail:'seller@example.test',supportPhone:'9876543210',grievanceName:'Isolated seller',originPin:'700001',upiId:'test@bank',payeeName:'Isolated seller',returnsPolicy:'Isolated fixture returns policy.',shippingPolicy:'Isolated fixture shipping policy.',eligibilityBasis:'Isolated legal fixture, not a real permission.'}));
const media = randomUUID();
// A valid one-pixel local fixture, not a public product photo.
const sharp = (await import('sharp')).default;
const image = await sharp({create:{width:20,height:20,channels:3,background:'#dd742a'}}).webp().toBuffer();
await db.prepare('INSERT INTO direct_media(id,mime,bytes,size,created_at) VALUES(?,?,?,?,?)').run(media,'image/webp',image,image.length,now);
const product = await shop.saveProduct(randomUUID(), {id:'',version:0,title:'Isolated audit garment',description:'Only in a local test database. Never offered for sale.',category:'Clothing',materials:'Test wool',care:'Hand wash',measurements:'Test size',maker:'sourced',status:'published',referenceType:'mrp',referenceMinor:200000,priceMinor:150000,floorMinor:140000,referenceEvidence:'Isolated fixture only',scope:'india',eligibilityBasis:'Isolated fixture only',weightGrams:500,lengthCm:25,widthCm:20,heightCm:10,media:[{id:media,kind:'image',alt:'Local audit fixture'}],variants:[{id:'standard',label:'Medium',available:20,mode:'ready',leadDays:2}],couponCode:'TEST100',couponOffMinor:10000,couponEndsAt:new Date(Date.now()+86400000).toISOString()}, users.super_admin!.id);
for (const [provider,totalMinor,transitDays] of [['Slow test carrier',7000,15],['Fast test carrier',12000,2]] as const) {
 await shop.saveRate({id:randomUUID(),productId:product.id,parcelKey:parcelKey(product),originPin:'700001',destinationPin:'110001',destinationState:'Delhi',provider,service:'Surface',serviceable:true,totalMinor,transitDays,pickupWaitDays:3,expiresAt:new Date(Date.now()+86400000).toISOString(),evidence:'Isolated test confirmation',verifiedAt:now,allChargesConfirmed:true},users.super_admin!.id);
}
writeFileSync('/tmp/dm-audit-fixtures.json',JSON.stringify({users,password,productId:product.id}),{mode:0o600});
client.close(); console.log('Isolated audit fixtures ready. No remote database or mail transport used.');

}
void main().catch((err) => { console.error(err); process.exitCode=1; });
