import { createHash } from "node:crypto";
import { z } from "zod";
import {
  EMPTY_SHOP,
  cheapestDelivery,
  parcelKey,
  sellingTotal,
  discountFacts,
  type DirectProduct,
  type DeliveryRate,
  type ShopSettings,
} from "@dealmosaic/core";
import { db, newId, nowIso, type Tx } from "../db/index.js";
import { ApiError, badRequest, conflict, notFound } from "../lib/http.js";

const money = z.number().int().min(0).max(100_000_000);
const text = (n = 200) => z.string().trim().max(n);
const pin = z.string().regex(/^[1-9]\d{5}$/);
export const productSchema = z
  .object({
    title: text(120).min(3),
    description: text(5000),
    category: text(60),
    materials: text(1000),
    care: text(1000),
    measurements: text(1000),
    maker: z.enum(["sourced", "self"]),
    status: z.enum(["draft", "published", "archived"]),
    referenceType: z.enum(["none", "mrp", "previous"]),
    referenceMinor: money,
    priceMinor: money.min(100),
    floorMinor: money.min(100),
    referenceEvidence: text(1000),
    scope: z.enum(["hold", "west_bengal", "india"]),
    eligibilityBasis: text(2000),
    weightGrams: z.number().int().min(0).max(35000),
    lengthCm: z.number().min(0).max(150),
    widthCm: z.number().min(0).max(150),
    heightCm: z.number().min(0).max(150),
    media: z
      .array(
        z.object({
          id: z.string().uuid(),
          kind: z.enum(["image", "video"]),
          alt: text(200).min(1),
        }),
      )
      .max(8),
    variants: z
      .array(
        z.object({
          id: z.string().regex(/^[a-zA-Z0-9-]{1,50}$/),
          label: text(100).min(1),
          available: z.number().int().min(0).max(10000),
          mode: z.enum(["ready", "made"]),
          leadDays: z.number().int().min(0).max(180),
        }),
      )
      .min(1)
      .max(20),
    couponCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{0,32}$/),
    couponOffMinor: money,
    couponEndsAt: text(40),
    version: z.number().int().min(0).default(0),
  })
  .superRefine((p, c) => {
    const fail = (message: string) => c.addIssue({ code: "custom", message });
    if (p.floorMinor > p.priceMinor)
      fail("Minimum price cannot exceed selling price.");
    if (
      p.referenceType !== "none" &&
      (p.referenceMinor < p.priceMinor || p.referenceEvidence.length < 8)
    )
      fail(
        "Use a genuine reference price at least equal to the selling price, with a basis for the claim.",
      );
    if (new Set(p.variants.map((v) => v.id)).size !== p.variants.length)
      fail("Option IDs must be unique.");
    if (p.variants.some((v) => v.mode === "made" && v.leadDays < 1))
      fail("Made-to-order items need a production time.");
    if (
      p.couponCode &&
      (!Number.isFinite(Date.parse(p.couponEndsAt)) ||
        p.couponOffMinor < 1 ||
        p.priceMinor - p.couponOffMinor < p.floorMinor)
    )
      fail("The coupon needs an expiry and must respect the minimum price.");
    if (
      p.status === "published" &&
      (p.scope === "hold" ||
        p.eligibilityBasis.length < 20 ||
        !p.description ||
        !p.materials ||
        !p.measurements ||
        !p.care ||
        !p.category ||
        !p.media.some((m) => m.kind === "image") ||
        !p.weightGrams ||
        !p.lengthCm ||
        !p.widthCm ||
        !p.heightCm)
    )
      fail(
        "Publishing needs product details, a photo, packed measurements and a documented sales-eligibility basis.",
      );
  });
export const settingsSchema = z
  .object({
    enabled: z.boolean(),
    sellerName: text(150),
    sellerAddress: text(1000),
    supportEmail: text(200),
    supportPhone: text(30),
    grievanceName: text(150),
    originPin: text(6),
    originState: z.literal("West Bengal"),
    upiId: text(150),
    payeeName: text(150),
    returnsPolicy: text(5000),
    shippingPolicy: text(5000),
    eligibilityBasis: text(3000),
  })
  .superRefine((s, c) => {
    if (s.originPin && !/^[1-9]\d{5}$/.test(s.originPin))
      c.addIssue({
        code: "custom",
        message:
          "Use the actual West Bengal dispatch PIN; its existence still needs carrier confirmation.",
      });
    if (
      s.enabled &&
      (!s.sellerName ||
        s.sellerAddress.length < 15 ||
        !z.string().email().safeParse(s.supportEmail).success ||
        !/^[+\d -]{7,20}$/.test(s.supportPhone) ||
        !s.grievanceName ||
        !s.originPin ||
        !/^[a-zA-Z0-9._-]{2,100}@[a-zA-Z0-9.-]{2,50}$/.test(s.upiId) ||
        !s.payeeName ||
        s.returnsPolicy.length < 30 ||
        s.shippingPolicy.length < 30 ||
        s.eligibilityBasis.length < 30)
    )
      c.addIssue({
        code: "custom",
        message:
          "Complete seller/contact details, dispatch PIN, UPI, policies and the reviewed business eligibility basis before enabling sales.",
      });
  });
export const rateSchema = z.object({
  productId: z.string().uuid(),
  originPin: pin,
  destinationPin: pin,
  destinationState: text(60).min(2),
  provider: text(100).min(2),
  service: text(100).min(2),
  serviceable: z.boolean(),
  totalMinor: money,
  transitDays: z.number().int().min(1).max(60),
  pickupWaitDays: z.number().int().min(0).max(30),
  expiresAt: z.string().datetime(),
  evidence: text(2000).min(20),
  allChargesConfirmed: z.literal(true),
});
export function parsed<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success)
    throw badRequest(r.error.issues.map((i) => i.message).join(" "));
  return r.data;
}
export async function settings(tx: Tx = db): Promise<ShopSettings> {
  const row = await tx
    .prepare("SELECT data FROM direct_settings WHERE id=1")
    .get();
  return row ? JSON.parse(String(row.data)) : { ...EMPTY_SHOP };
}
export async function product(id: string, tx: Tx = db): Promise<DirectProduct> {
  const row = await tx
    .prepare("SELECT * FROM direct_products WHERE id=?")
    .get(id);
  if (!row) throw notFound("Product not found.");
  return { ...JSON.parse(String(row.data)), id, version: Number(row.version) };
}
export async function products() {
  return (
    await db
      .prepare(
        "SELECT * FROM direct_products ORDER BY updated_at DESC LIMIT 200",
      )
      .all()
  ).map(
    (r) =>
      ({
        ...JSON.parse(String(r.data)),
        id: String(r.id),
        version: Number(r.version),
      }) as DirectProduct,
  );
}
export async function event(
  tx: Tx,
  actor: string | null,
  id: string,
  action: string,
  detail: unknown = {},
) {
  await tx
    .prepare(
      "INSERT INTO direct_events (id,actor_id,entity_id,action,detail,at) VALUES(?,?,?,?,?,?)",
    )
    .run(newId(), actor, id, action, JSON.stringify(detail), nowIso());
}
export function publicProduct(p: DirectProduct) {
  const {
    floorMinor,
    referenceEvidence,
    eligibilityBasis,
    couponOffMinor,
    couponEndsAt,
    couponCode,
    ...view
  } = p;
  return {
    ...view,
    discount:
      p.referenceType === "none"
        ? null
        : discountFacts(p.referenceMinor, p.priceMinor),
    variants: p.variants.map((v) => ({
      ...v,
      available: v.available > 0 ? 1 : 0,
    })),
  };
}
export async function saveProduct(id: string, input: unknown, actor: string) {
  const p = parsed(productSchema, input);
  return db.transaction(async (tx) => {
    const row = await tx
      .prepare("SELECT version FROM direct_products WHERE id=?")
      .get(id);
    if ((row ? Number(row.version) : 0) !== p.version)
      throw conflict("This product changed. Reload it before saving.");
    const s = await settings(tx);
    if (p.status === "published" && !s.enabled)
      throw badRequest(
        "Complete and enable shop settings before publishing. Drafts do not require GSTIN.",
      );
    for (const m of p.media) {
      const r = await tx
        .prepare("SELECT mime FROM direct_media WHERE id=?")
        .get(m.id);
      if (!r || !String(r.mime).startsWith(m.kind + "/"))
        throw badRequest("A photo or video is missing. Upload it again.");
    }
    const reserved = await tx
      .prepare(
        "SELECT data FROM direct_orders WHERE json_extract(data,'$.productId')=? AND status IN ('awaiting_payment','payment_review','paid')",
      )
      .all(id);
    for (const r of reserved) {
      const order = JSON.parse(String(r.data)) as DirectOrder;
      if (!p.variants.some((v) => v.id === order.variantId))
        throw conflict(
          "An option has an active order. Keep it with zero available quantity instead of removing it.",
        );
    }
    const version = p.version + 1;
    await tx
      .prepare(
        "INSERT INTO direct_products(id,data,status,version,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,status=excluded.status,version=excluded.version,updated_at=excluded.updated_at",
      )
      .run(id, JSON.stringify(p), p.status, version, nowIso());
    await event(tx, actor, id, "product_saved", {
      version,
      status: p.status,
      priceMinor: p.priceMinor,
    });
    return { ...p, id, version };
  });
}
export async function rates() {
  return (await db.prepare("SELECT data FROM direct_rates").all()).map(
    (r) => JSON.parse(String(r.data)) as DeliveryRate,
  );
}
export async function saveRate(input: unknown, actor: string) {
  const r = parsed(rateSchema, input);
  const s = await settings();
  const p = await product(r.productId);
  if (r.originPin !== s.originPin)
    throw badRequest("The quote must start at your configured dispatch PIN.");
  if (!p.weightGrams || !p.lengthCm || !p.widthCm || !p.heightCm)
    throw badRequest(
      "Enter packed weight and all three dimensions before checking carriers.",
    );
  if (
    Date.parse(r.expiresAt) <= Date.now() ||
    Date.parse(r.expiresAt) > Date.now() + 7 * 86400000
  )
    throw badRequest("Use a current quote valid for at most seven days.");
  const rate: DeliveryRate = {
    ...r,
    id: newId(),
    parcelKey: parcelKey(p),
    verifiedAt: nowIso(),
  };
  await db.transaction(async (tx) => {
    // Supersede a previous result for this exact carrier service/lane/parcel.
    const old = await tx
      .prepare("SELECT id,data FROM direct_rates WHERE product_id=?")
      .all(p.id);
    for (const row of old) {
      const o = JSON.parse(String(row.data)) as DeliveryRate;
      if (
        o.originPin === r.originPin &&
        o.destinationPin === r.destinationPin &&
        o.provider === r.provider &&
        o.service === r.service
      )
        await tx
          .prepare("DELETE FROM direct_rates WHERE id=?")
          .run(String(row.id));
    }
    await tx
      .prepare(
        "DELETE FROM direct_delivery_checks WHERE product_id=? AND destination_pin=?",
      )
      .run(p.id, r.destinationPin);
    await tx
      .prepare("INSERT INTO direct_rates(id,product_id,data) VALUES(?,?,?)")
      .run(rate.id, p.id, JSON.stringify(rate));
    await event(tx, actor, rate.id, "delivery_confirmed", {
      productId: p.id,
      provider: r.provider,
      totalMinor: r.totalMinor,
      serviceable: r.serviceable,
    });
  });
  return rate;
}
export type Quote = {
  id: string;
  productId: string;
  productVersion: number;
  variantId: string;
  destinationPin: string;
  rate: DeliveryRate;
  compared: number;
  expiresAt: string;
  code: string;
  settingsFingerprint: string;
  totals: ReturnType<typeof sellingTotal>;
  deliveryDays: number;
};
const fingerprint = (s: ShopSettings) =>
  createHash("sha256").update(JSON.stringify(s)).digest("hex");
export async function makeQuote(
  productId: string,
  variantId: string,
  destinationPin: string,
  code = "",
) {
  parsed(pin, destinationPin);
  const s = await settings();
  if (!s.enabled)
    throw new ApiError(
      503,
      "shop_paused",
      "Direct sales are not accepting orders.",
    );
  const p = await product(productId);
  if (p.status !== "published") throw notFound();
  const v = p.variants.find((v) => v.id === variantId);
  if (!v || v.available < 1) throw conflict("This option is not available.");
  const choice = cheapestDelivery(
    await rates(),
    p,
    s.originPin,
    destinationPin,
  );
  if (!choice.selected) {
    if (choice.status === "unknown")
      await db.transaction(async (tx) => {
        const existing = await tx
          .prepare(
            "SELECT checks FROM direct_delivery_checks WHERE product_id=? AND destination_pin=?",
          )
          .get(p.id, destinationPin);
        const count = Number(
          (
            await tx
              .prepare("SELECT COUNT(*) AS n FROM direct_delivery_checks")
              .get()
          )?.n ?? 0,
        );
        if (existing || count < 200)
          await tx
            .prepare(
              "INSERT INTO direct_delivery_checks(product_id,destination_pin,checks,last_checked) VALUES(?,?,1,?) ON CONFLICT(product_id,destination_pin) DO UPDATE SET checks=checks+1,last_checked=excluded.last_checked",
            )
            .run(p.id, destinationPin, nowIso());
      });
    return {
      status: choice.status,
      message:
        choice.status === "unknown"
          ? "Delivery has not been confirmed for this parcel and PIN. No payment can be taken. Please check again later or contact the seller."
          : choice.status === "restricted"
            ? "This product cannot currently be sold to this destination."
            : "None of the checked services can deliver this parcel to this PIN.",
      quote: null,
    };
  }
  let totals: ReturnType<typeof sellingTotal>;
  try {
    totals = sellingTotal(p, code, choice.selected.totalMinor);
  } catch (e) {
    throw badRequest((e as Error).message);
  }
  const q: Quote = {
    id: newId(),
    productId,
    productVersion: p.version,
    variantId,
    destinationPin,
    rate: choice.selected,
    compared: choice.compared,
    expiresAt: new Date(
      Math.min(Date.now() + 15 * 60000, Date.parse(choice.selected.expiresAt)),
    ).toISOString(),
    code,
    settingsFingerprint: fingerprint(s),
    totals,
    deliveryDays:
      v.leadDays + choice.selected.pickupWaitDays + choice.selected.transitDays,
  };
  await db
    .prepare("INSERT INTO direct_quotes(id,data,expires_at) VALUES(?,?,?)")
    .run(q.id, JSON.stringify(q), q.expiresAt);
  const { settingsFingerprint, ...safe } = q;
  const { evidence, ...rate } = safe.rate;
  return {
    status: "available",
    message:
      "Lowest total among the confirmed services for this parcel. Booking is separate.",
    quote: { ...safe, rate },
  };
}
export const buyerSchema = z.object({
  name: text(100).min(2),
  email: z.string().email().max(200),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  address: text(1000).min(12),
  city: text(100).min(2),
  state: text(60).min(2),
  pincode: pin,
});
export interface DirectOrder {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  option: string;
  buyer: z.infer<typeof buyerSchema>;
  totals: ReturnType<typeof sellingTotal>;
  rate: DeliveryRate;
  deliveryDays: number;
  status: string;
  createdAt: string;
  reservationUntil: string;
  customerReference: string;
  tracking: string;
  seller: ShopSettings;
  note: string;
}
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
async function releaseStock(tx: Tx, o: DirectOrder) {
  const p = await product(o.productId, tx);
  const v = p.variants.find((v) => v.id === o.variantId);
  if (v) v.available++;
  else
    throw conflict(
      "Restore the reserved product option before cancelling this order.",
    );
  await tx
    .prepare(
      "UPDATE direct_products SET data=?,version=version+1,updated_at=? WHERE id=?",
    )
    .run(JSON.stringify(p), nowIso(), p.id);
}
export async function createOrder(input: unknown) {
  const body = parsed(
    z.object({
      quoteId: z.string().uuid(),
      accessToken: z.string().regex(/^[a-f0-9]{64}$/),
      buyer: buyerSchema,
      policiesAccepted: z.literal(true),
    }),
    input,
  );
  return db.transaction(async (tx) => {
    const hash = tokenHash(body.accessToken);
    const existing = await tx
      .prepare("SELECT data FROM direct_orders WHERE access_hash=?")
      .get(hash);
    if (existing) return JSON.parse(String(existing.data)) as DirectOrder;
    const active = await tx
      .prepare(
        "SELECT COUNT(*) AS n FROM direct_orders WHERE lower(json_extract(data,'$.buyer.email'))=lower(?) AND status IN ('awaiting_payment','payment_review')",
      )
      .get(body.buyer.email);
    if (Number(active?.n ?? 0) >= 2)
      throw conflict(
        "Two orders already await payment for this email. Complete or resolve those first.",
      );
    const row = await tx
      .prepare("SELECT data FROM direct_quotes WHERE id=? AND expires_at>?")
      .get(body.quoteId, nowIso());
    if (!row) throw conflict("The quote expired. Check delivery again.");
    if (
      await tx
        .prepare("SELECT id FROM direct_orders WHERE quote_id=?")
        .get(body.quoteId)
    )
      throw conflict("This quote has already been used.");
    const q = JSON.parse(String(row.data)) as Quote;
    const s = await settings(tx);
    if (!s.enabled || q.settingsFingerprint !== fingerprint(s))
      throw conflict("Shop details changed. Check delivery again.");
    const p = await product(q.productId, tx);
    if (p.status !== "published" || p.version !== q.productVersion)
      throw conflict(
        "Product details or availability changed. Check delivery again.",
      );
    const v = p.variants.find((v) => v.id === q.variantId);
    if (!v || v.available < 1) throw conflict("This option just sold out.");
    if (
      body.buyer.pincode !== q.destinationPin ||
      body.buyer.state !== q.rate.destinationState
    )
      throw badRequest(
        "The address PIN/state must match the confirmed delivery route.",
      );
    const rr = await tx
      .prepare("SELECT data FROM direct_rates WHERE id=?")
      .get(q.rate.id);
    if (!rr || Date.parse(q.rate.expiresAt) <= Date.now())
      throw conflict("The delivery quote is no longer current.");
    const all = (
      await tx
        .prepare("SELECT data FROM direct_rates WHERE product_id=?")
        .all(p.id)
    ).map((r) => JSON.parse(String(r.data)) as DeliveryRate);
    const latest = cheapestDelivery(all, p, s.originPin, q.destinationPin);
    if (!latest.selected || latest.selected.id !== q.rate.id)
      throw conflict(
        "Delivery choices changed. Check again for the lowest charge.",
      );
    let totals;
    try {
      totals = sellingTotal(p, q.code, q.rate.totalMinor);
    } catch (e) {
      throw badRequest((e as Error).message);
    }
    if (totals.totalMinor !== q.totals.totalMinor)
      throw conflict("Your offer changed. Check delivery again.");
    v.available--;
    await tx
      .prepare(
        "UPDATE direct_products SET data=?,version=version+1,updated_at=? WHERE id=?",
      )
      .run(JSON.stringify(p), nowIso(), p.id);
    const o: DirectOrder = {
      id: newId(),
      productId: p.id,
      variantId: v.id,
      title: p.title,
      option: v.label,
      buyer: body.buyer,
      totals,
      rate: q.rate,
      deliveryDays: q.deliveryDays,
      status: "awaiting_payment",
      createdAt: nowIso(),
      reservationUntil: new Date(Date.now() + 24 * 3600000).toISOString(),
      customerReference: "",
      tracking: "",
      seller: s,
      note: "",
    };
    await tx
      .prepare(
        "INSERT INTO direct_orders(id,access_hash,quote_id,data,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
      )
      .run(
        o.id,
        hash,
        q.id,
        JSON.stringify(o),
        o.status,
        o.createdAt,
        o.createdAt,
      );
    await event(tx, null, o.id, "order_created", {
      totalMinor: o.totals.totalMinor,
      provider: o.rate.provider,
      service: o.rate.service,
    });
    return o;
  });
}
export function publicOrder(o: DirectOrder) {
  const { evidence, ...rate } = o.rate;
  const { eligibilityBasis, enabled, ...seller } = o.seller;
  return { ...o, rate, seller };
}
export async function authorisedOrder(id: string, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw notFound();
  const row = await db
    .prepare("SELECT data FROM direct_orders WHERE id=? AND access_hash=?")
    .get(id, tokenHash(token));
  if (!row) throw notFound();
  return JSON.parse(String(row.data)) as DirectOrder;
}
export async function orderAction(
  id: string,
  action: string,
  detail: string,
  actor: string | null,
  token?: string,
) {
  return db.transaction(async (tx) => {
    const row = await tx
      .prepare("SELECT data,access_hash FROM direct_orders WHERE id=?")
      .get(id);
    if (!row || (!actor && String(row.access_hash) !== tokenHash(token ?? "")))
      throw notFound();
    const o = JSON.parse(String(row.data)) as DirectOrder;
    if (action === "reference") {
      if (o.status !== "awaiting_payment" && o.status !== "payment_review")
        throw conflict(
          "This order is not accepting payment references. Contact support if you already paid.",
        );
      if (Date.parse(o.reservationUntil) <= Date.now())
        throw conflict(
          "The payment window ended. Contact support before paying.",
        );
      if (!/^[A-Z0-9]{10,35}$/i.test(detail))
        throw badRequest("Enter the transaction reference from your UPI app.");
      o.customerReference = detail.toUpperCase();
      o.status = "payment_review";
    } else {
      if (!actor) throw notFound();
      if (action === "late_credit") {
        if (!["expired", "cancelled"].includes(o.status))
          throw conflict(
            "Late-credit reconciliation is only for expired or cancelled orders.",
          );
        if (!/^[A-Z0-9]{10,35}$/i.test(detail))
          throw badRequest("Enter the actual bank-credit reference.");
        if (
          await tx
            .prepare(
              "SELECT id FROM direct_orders WHERE bank_reference=? AND id<>?",
            )
            .get(detail.toUpperCase(), id)
        )
          throw conflict(
            "This bank credit is already linked to another order.",
          );
        await tx
          .prepare("UPDATE direct_orders SET bank_reference=? WHERE id=?")
          .run(detail.toUpperCase(), id);
        o.status = "refund_required";
      } else if (action === "paid") {
        if (!["awaiting_payment", "payment_review"].includes(o.status))
          throw conflict("This order cannot be marked paid.");
        if (
          Date.parse(o.reservationUntil) <= Date.now() &&
          o.status === "awaiting_payment"
        )
          throw conflict(
            "The payment window ended. Reconcile this order before taking further action.",
          );
        if (!/^[A-Z0-9]{10,35}$/i.test(detail))
          throw badRequest(
            "Enter the actual bank-credit reference, not just the shopper claim.",
          );
        if (
          await tx
            .prepare(
              "SELECT id FROM direct_orders WHERE bank_reference=? AND id<>?",
            )
            .get(detail.toUpperCase(), id)
        )
          throw conflict(
            "This bank credit is already linked to another order.",
          );
        await tx
          .prepare("UPDATE direct_orders SET bank_reference=? WHERE id=?")
          .run(detail.toUpperCase(), id);
        o.status = "paid";
      } else if (action === "dispatch") {
        if (o.status !== "paid")
          throw conflict("Verify the bank credit before dispatch.");
        if (detail.length < 4 || detail.length > 100)
          throw badRequest("Enter the tracking/AWB reference.");
        o.tracking = detail;
        o.status = "dispatched";
      } else if (action === "delivered") {
        if (o.status !== "dispatched")
          throw conflict("Only a dispatched order can be marked delivered.");
        o.status = "delivered";
      } else if (action === "cancel") {
        if (!["awaiting_payment", "payment_review"].includes(o.status))
          throw conflict(
            "Paid orders need a confirmed refund, not cancellation.",
          );
        if (detail.length < 10)
          throw badRequest(
            "Record why this is cancelled and confirm no bank credit is unresolved.",
          );
        await releaseStock(tx, o);
        o.status = "cancelled";
      } else if (action === "refunded") {
        if (
          !["paid", "dispatched", "delivered", "refund_required"].includes(
            o.status,
          )
        )
          throw conflict("Only paid orders can be refunded.");
        if (detail.length < 10)
          throw badRequest(
            "Record the completed full refund reference. This action does not move money.",
          );
        o.status = "refunded";
      } else throw badRequest("Unknown order action.");
    }
    // Never publish private reconciliation notes or bank-confirmation references.
    await tx
      .prepare(
        "UPDATE direct_orders SET data=?,status=?,updated_at=? WHERE id=?",
      )
      .run(JSON.stringify(o), o.status, nowIso(), id);
    await event(tx, actor, id, action, { detail });
    return o;
  });
}
export async function expireOrders() {
  const rows = await db
    .prepare("SELECT id FROM direct_orders WHERE status='awaiting_payment'")
    .all();
  let count = 0;
  for (const r of rows)
    await db.transaction(async (tx) => {
      const row = await tx
        .prepare(
          "SELECT data FROM direct_orders WHERE id=? AND status='awaiting_payment'",
        )
        .get(String(r.id));
      if (!row) return;
      const o = JSON.parse(String(row.data)) as DirectOrder;
      if (Date.parse(o.reservationUntil) > Date.now()) return;
      await releaseStock(tx, o);
      o.status = "expired";
      await tx
        .prepare(
          "UPDATE direct_orders SET data=?,status=?,updated_at=? WHERE id=?",
        )
        .run(JSON.stringify(o), o.status, nowIso(), o.id);
      await event(tx, null, o.id, "expired");
      count++;
    });
  await db
    .prepare("DELETE FROM direct_delivery_checks WHERE last_checked < ?")
    .run(new Date(Date.now() - 7 * 86400000).toISOString());
  await db
    .prepare("DELETE FROM direct_quotes WHERE expires_at < ?")
    .run(new Date(Date.now() - 86400000).toISOString());
  return count;
}
