import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import sharp from "sharp";
import {
  cheapestDelivery,
  discountFacts,
  EMPTY_SHOP,
  parcelKey,
  sellingTotal,
  type DirectProduct,
  type DeliveryRate,
} from "@dealmosaic/core";
process.env.DB_PATH = `/tmp/dm-direct-${process.pid}.db`;
process.env.NODE_ENV = "development";
process.env.SITE_URL = "https://dealmosaic.pages.dev";
let app: (typeof import("../src/app.js"))["app"];
let db: (typeof import("../src/db/index.js"))["db"];
let shop: typeof import("../src/services/direct-shop.js");
let cookie = "",
  csrf = "",
  adminId = "";
let seq = 0;
async function req(
  method: string,
  path: string,
  body?: unknown,
  extra: Record<string, string> = {},
  auth = true,
) {
  const res = await app.request(path, {
    method,
    headers: {
      origin: "https://dealmosaic.pages.dev",
      "x-forwarded-for": `198.51.${Math.floor(++seq / 250)}.${seq % 250}`,
      ...(auth ? { cookie, "x-csrf-token": csrf } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: res.status,
    data: (await res.json()) as any,
    headers: res.headers,
  };
}
const fixture = (): DirectProduct => ({
  id: randomUUID(),
  version: 0,
  title: "Test wool sweater",
  description: "A test garment only in the isolated test database.",
  category: "Clothing",
  materials: "Wool",
  care: "Hand wash",
  measurements: "Chest 100 cm",
  maker: "sourced",
  status: "draft",
  referenceType: "mrp",
  referenceMinor: 200000,
  priceMinor: 150000,
  floorMinor: 140000,
  referenceEvidence: "TEST ONLY package MRP basis",
  scope: "india",
  eligibilityBasis: "TEST ONLY product eligibility fixture",
  weightGrams: 500,
  lengthCm: 25,
  widthCm: 20,
  heightCm: 10,
  media: [],
  variants: [
    {
      id: "standard",
      label: "Medium",
      available: 2,
      mode: "ready",
      leadDays: 2,
    },
  ],
  couponCode: "TEST100",
  couponOffMinor: 10000,
  couponEndsAt: new Date(Date.now() + 86400000).toISOString(),
});
const rateFixture = (
  p: DirectProduct,
  override: Partial<DeliveryRate> = {},
): DeliveryRate => ({
  id: randomUUID(),
  productId: p.id,
  parcelKey: parcelKey(p),
  originPin: "700001",
  destinationPin: "110001",
  destinationState: "Delhi",
  provider: "Test Carrier",
  service: "Surface",
  serviceable: true,
  totalMinor: 8000,
  transitDays: 15,
  pickupWaitDays: 3,
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  evidence: "TEST ONLY carrier confirmation",
  verifiedAt: new Date().toISOString(),
  ...override,
});
async function seed() {
  const p = fixture();
  const media = randomUUID();
  await db
    .prepare(
      "INSERT INTO direct_media(id,mime,bytes,size,created_at) VALUES(?,?,?,?,?)",
    )
    .run(media, "image/webp", Buffer.from("test"), 4, new Date().toISOString());
  p.media = [{ id: media, kind: "image", alt: "Test only" }];
  p.status = "published";
  const product = await shop.saveProduct(p.id, p, adminId);
  return product;
}
async function addRate(p: DirectProduct, over: Partial<DeliveryRate> = {}) {
  return shop.saveRate(
    { ...rateFixture(p, over), allChargesConfirmed: true },
    adminId,
  );
}
const buyer = {
  name: "Test Buyer",
  email: "buyer@example.test",
  phone: "9876543210",
  address: "Test-only address, not a real order",
  city: "New Delhi",
  state: "Delhi",
  pincode: "110001",
};
async function order(p: DirectProduct) {
  const q = await shop.makeQuote(p.id, "standard", "110001");
  const token = randomBytes(32).toString("hex");
  const o = await shop.createOrder({
    quoteId: q.quote!.id,
    accessToken: token,
    buyer,
    policiesAccepted: true,
  });
  return { o, token, quoteId: q.quote!.id };
}
beforeAll(async () => {
  const mod = await import("../src/app.js");
  app = mod.app;
  await mod.ready;
  db = (await import("../src/db/index.js")).db;
  shop = await import("../src/services/direct-shop.js");
  const reg = await req(
    "POST",
    "/api/auth/register",
    {
      email: "shop-admin@example.test",
      password: "A-test-passphrase-42!",
      passwordConfirm: "A-test-passphrase-42!",
      displayName: "Shop Test",
      ageConfirmed: true,
    },
    {},
    false,
  );
  const link = reg.data.devActionUrl;
  expect(link).toBeTruthy();
  const v = await req(
    "POST",
    "/api/auth/verify-email",
    { token: new URL(link).searchParams.get("token") },
    {},
    false,
  );
  cookie = v.headers.get("set-cookie")!.split(";")[0]!;
  csrf = v.data.csrfToken;
  adminId = v.data.user.id;
  await db
    .prepare("UPDATE users SET role='super_admin' WHERE id=?")
    .run(adminId);
});
beforeEach(async () => {
  for (const t of [
    "direct_delivery_checks",
    "direct_events",
    "direct_orders",
    "direct_quotes",
    "direct_rates",
    "direct_products",
    "direct_media",
    "direct_settings",
  ])
    await db.prepare(`DELETE FROM ${t}`).run();
  await db
    .prepare("INSERT INTO direct_settings(id,data,version) VALUES(1,?,1)")
    .run(
      JSON.stringify({
        ...EMPTY_SHOP,
        enabled: true,
        sellerName: "Test seller",
        sellerAddress: "Test only business address",
        supportEmail: "seller@example.test",
        supportPhone: "9876543210",
        grievanceName: "Test seller",
        originPin: "700001",
        upiId: "test@bank",
        payeeName: "Test seller",
        returnsPolicy: "Test only returns policy for isolated tests.",
        shippingPolicy: "Test only shipping policy for isolated tests.",
        eligibilityBasis: "Test only documented business eligibility fixture.",
      }),
    );
});
afterAll(async () => {
  await (await import("../src/db/index.js")).client.close();
  for (const suffix of ["", "-wal", "-shm"])
    rmSync(process.env.DB_PATH + suffix, { force: true });
});

describe("real-price arithmetic and cheapest delivery", () => {
  it("computes savings from genuine reference and sale price", () =>
    expect(discountFacts(200000, 150000)).toEqual({
      savingMinor: 50000,
      percent: 25,
    }));
  it("never overstates fractional percentage", () =>
    expect(discountFacts(99900, 80000)?.percent).toBe(19));
  it("no reference or equal price produces no discount claim", () => {
    expect(discountFacts(0, 100)).toBeNull();
    expect(discountFacts(100, 100)).toBeNull();
    expect(discountFacts(100, 200)).toBeNull();
  });
  it("chooses a slower service when cheaper, including pickup waiting", () => {
    const p = fixture();
    const slow = rateFixture(p, {
      totalMinor: 7000,
      transitDays: 15,
      pickupWaitDays: 8,
    });
    expect(
      cheapestDelivery(
        [rateFixture(p, { totalMinor: 10000, transitDays: 1 }), slow],
        p,
        "700001",
        "110001",
      ).selected?.id,
    ).toBe(slow.id);
  });
  it("uses faster total elapsed time only to break a price tie", () => {
    const p = fixture();
    const faster = rateFixture(p, { transitDays: 5, pickupWaitDays: 1 });
    expect(
      cheapestDelivery([rateFixture(p), faster], p, "700001", "110001").selected
        ?.id,
    ).toBe(faster.id);
  });
  it("does not treat unknown delivery as rejection", () => {
    const p = fixture();
    expect(cheapestDelivery([], p, "700001", "110001").status).toBe("unknown");
    expect(
      cheapestDelivery(
        [rateFixture(p, { serviceable: false })],
        p,
        "700001",
        "110001",
      ).status,
    ).toBe("unserviceable");
  });
  it("rejects stale, wrong-route and changed parcel quotes", () => {
    const p = fixture();
    expect(
      cheapestDelivery(
        [
          rateFixture(p, { expiresAt: "2020-01-01T00:00:00Z" }),
          rateFixture(p, { destinationPin: "560001" }),
          rateFixture(p, { parcelKey: "other" }),
        ],
        p,
        "700001",
        "110001",
      ).selected,
    ).toBeNull();
  });
  it("does not confuse courier coverage with interstate sales eligibility", () => {
    const p = { ...fixture(), scope: "west_bengal" as const };
    expect(
      cheapestDelivery([rateFixture(p)], p, "700001", "110001").status,
    ).toBe("restricted");
  });
  it("adds shipping after discount and honours the private price floor", () => {
    expect(sellingTotal(fixture(), "TEST100", 8000)).toEqual({
      itemMinor: 140000,
      discountMinor: 10000,
      shippingMinor: 8000,
      totalMinor: 148000,
    });
    expect(() =>
      sellingTotal({ ...fixture(), floorMinor: 150000 }, "TEST100", 8000),
    ).toThrow("minimum");
  });
  it("refuses an invalid or expired coupon", () => {
    expect(() => sellingTotal(fixture(), "WRONG", 8000)).toThrow();
    expect(() =>
      sellingTotal(
        { ...fixture(), couponEndsAt: "2020-01-01T00:00:00Z" },
        "TEST100",
        8000,
      ),
    ).toThrow();
  });
});
describe("shop API protection and publishing", () => {
  it("denies anonymous admin access", async () =>
    expect(
      (await req("GET", "/api/direct-admin/overview", undefined, {}, false))
        .status,
    ).toBe(401));
  it("denies non-admin even when signed in", async () => {
    await db.prepare("UPDATE users SET role='user' WHERE id=?").run(adminId);
    expect((await req("GET", "/api/direct-admin/overview")).status).toBe(403);
    await db
      .prepare("UPDATE users SET role='super_admin' WHERE id=?")
      .run(adminId);
  });
  it("requires CSRF on writes and rejects foreign origins", async () => {
    expect(
      (
        await req("POST", "/api/direct-admin/products", fixture(), {
          "x-csrf-token": "",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await req(
          "POST",
          "/api/direct/quote",
          {},
          { origin: "https://evil.invalid" },
          false,
        )
      ).status,
    ).toBe(403);
  });
  it("creates a draft without GSTIN or completed seller setup", async () => {
    await db.prepare("DELETE FROM direct_settings").run();
    const r = await req("POST", "/api/direct-admin/products", fixture());
    expect(r.status).toBe(201);
    expect(r.data.product.status).toBe("draft");
  });
  it("cannot enable incomplete checkout or publish a placeholder", async () => {
    expect(
      (
        await req("POST", "/api/direct-admin/settings", {
          ...EMPTY_SHOP,
          enabled: true,
          version: 1,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await req("POST", "/api/direct-admin/products", {
          ...fixture(),
          status: "published",
        })
      ).status,
    ).toBe(400);
  });
  it("rejects unsupported discount references and duplicate variant IDs", async () => {
    expect(
      (
        await req("POST", "/api/direct-admin/products", {
          ...fixture(),
          referenceEvidence: "",
        })
      ).status,
    ).toBe(400);
    const p = fixture();
    p.variants.push(p.variants[0]!);
    expect((await req("POST", "/api/direct-admin/products", p)).status).toBe(
      400,
    );
  });
  it("detects stale edits", async () => {
    const p = fixture();
    await shop.saveProduct(p.id, p, adminId);
    await expect(shop.saveProduct(p.id, p, adminId)).rejects.toThrow("changed");
  });
  it("does not expose cost floor, evidence or eligibility notes publicly", async () => {
    const p = await seed();
    const r = await req(
      "GET",
      `/api/direct/products/${p.id}`,
      undefined,
      {},
      false,
    );
    expect(r.status).toBe(200);
    expect(r.data.product.floorMinor).toBeUndefined();
    expect(r.data.product.eligibilityBasis).toBeUndefined();
    expect(r.data.product.referenceEvidence).toBeUndefined();
    expect(r.data.product.couponCode).toBeUndefined();
  });
  it("hides drafts and private draft media", async () => {
    const p = await seed();
    await shop.saveProduct(p.id, { ...p, status: "draft" }, adminId);
    expect(
      (await req("GET", `/api/direct/products/${p.id}`, undefined, {}, false))
        .status,
    ).toBe(404);
    const r = await app.request(`/api/direct/media/${p.media[0]!.id}`);
    expect(r.status).toBe(404);
  });
  it("decodes photos, removes metadata, persists and protects linked uploads", async () => {
    const image = await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 3,
        background: { r: 200, g: 100, b: 40 },
      },
    })
      .jpeg()
      .toBuffer();
    const r = await app.request("/api/direct-admin/media", {
      method: "POST",
      headers: { cookie, "x-csrf-token": csrf, "content-type": "image/jpeg" },
      body: new Uint8Array(image),
    });
    expect(r.status).toBe(201);
    const m = (await r.json()) as any;
    expect(m.kind).toBe("image");
    const stored = await db
      .prepare("SELECT mime,bytes FROM direct_media WHERE id=?")
      .get(m.id);
    expect(stored?.mime).toBe("image/webp");
    const meta = await sharp(
      Buffer.from(stored!.bytes as ArrayBuffer),
    ).metadata();
    expect(meta.exif).toBeUndefined();
    const p = fixture();
    await shop.saveProduct(
      p.id,
      { ...p, media: [{ id: m.id, kind: "image", alt: "Test photo" }] },
      adminId,
    );
    expect(
      (await req("DELETE", `/api/direct-admin/media/${m.id}`)).status,
    ).toBe(409);
  });
  it("rejects fake video and oversized request", async () => {
    const r = await app.request("/api/direct-admin/media", {
      method: "POST",
      headers: { cookie, "x-csrf-token": csrf, "content-type": "video/mp4" },
      body: new Uint8Array(40),
    });
    expect(r.status).toBe(400);
    const b = await req(
      "POST",
      "/api/direct/quote",
      { junk: "x".repeat(40000) },
      {},
      false,
    );
    expect(b.status).toBe(413);
  });
  it("never manufactures a rate when no source is connected", async () => {
    const p = await seed();
    const r = await shop.makeQuote(p.id, "standard", "110001");
    expect(r.status).toBe("unknown");
    expect(r.quote).toBeNull();
  });
  it("queues unknown PIN checks without buyer data and clears them on confirmation", async () => {
    const p = await seed();
    await shop.makeQuote(p.id, "standard", "110001");
    await shop.makeQuote(p.id, "standard", "110001");
    const rows = await db.prepare("SELECT * FROM direct_delivery_checks").all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.checks).toBe(2);
    await addRate(p);
    expect(
      await db.prepare("SELECT * FROM direct_delivery_checks").all(),
    ).toHaveLength(0);
  });
  it("invalidates old quotes when the packed dimensions change", async () => {
    let p = await seed();
    await addRate(p);
    p = await shop.saveProduct(p.id, { ...p, lengthCm: 30 }, adminId);
    expect((await shop.makeQuote(p.id, "standard", "110001")).status).toBe(
      "unknown",
    );
  });
});
describe("checkout, stock and money", () => {
  it("creates an order with server-calculated total and selected carrier", async () => {
    const p = await seed();
    await addRate(p);
    const { o } = await order(p);
    expect(o.totals.totalMinor).toBe(158000);
    expect(o.status).toBe("awaiting_payment");
    expect(o.rate.service).toBe("Surface");
    expect((await shop.product(p.id)).variants[0]!.available).toBe(1);
  });
  it("does not trust browser price or a changed address", async () => {
    const p = await seed();
    await addRate(p);
    const q = await shop.makeQuote(p.id, "standard", "110001");
    const b = {
      quoteId: q.quote!.id,
      accessToken: randomBytes(32).toString("hex"),
      buyer: { ...buyer, pincode: "560001" },
      policiesAccepted: true,
      totalMinor: 1,
    };
    await expect(shop.createOrder(b)).rejects.toThrow("PIN/state");
    const o = await shop.createOrder({ ...b, buyer });
    expect(o.totals.totalMinor).toBe(158000);
  });
  it("order retry is idempotent and cannot reserve twice", async () => {
    const p = await seed();
    await addRate(p);
    const { o, token, quoteId } = await order(p);
    const again = await shop.createOrder({
      quoteId,
      accessToken: token,
      buyer,
      policiesAccepted: true,
    });
    expect(again.id).toBe(o.id);
    expect((await shop.product(p.id)).variants[0]!.available).toBe(1);
  });
  it("last-unit purchase invalidates another quote", async () => {
    let p = await seed();
    p = await shop.saveProduct(
      p.id,
      { ...p, variants: [{ ...p.variants[0]!, available: 1 }] },
      adminId,
    );
    await addRate(p);
    const q1 = await shop.makeQuote(p.id, "standard", "110001");
    const q2 = await shop.makeQuote(p.id, "standard", "110001");
    const submit = (id: string) =>
      shop.createOrder({
        quoteId: id,
        accessToken: randomBytes(32).toString("hex"),
        buyer,
        policiesAccepted: true,
      });
    await submit(q1.quote!.id);
    await expect(submit(q2.quote!.id)).rejects.toThrow("changed");
    expect((await shop.product(p.id)).variants[0]!.available).toBe(0);
  });
  it("concurrent checkouts cannot oversell the last unit", async () => {
    let p = await seed();
    p = await shop.saveProduct(
      p.id,
      { ...p, variants: [{ ...p.variants[0]!, available: 1 }] },
      adminId,
    );
    await addRate(p);
    const a = await shop.makeQuote(p.id, "standard", "110001");
    const b = await shop.makeQuote(p.id, "standard", "110001");
    const result = await Promise.allSettled(
      [a, b].map((q) =>
        shop.createOrder({
          quoteId: q.quote!.id,
          accessToken: randomBytes(32).toString("hex"),
          buyer,
          policiesAccepted: true,
        }),
      ),
    );
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await shop.product(p.id)).variants[0]!.available).toBe(0);
    expect(
      (await db.prepare("SELECT COUNT(*) AS n FROM direct_orders").get())?.n,
    ).toBe(1);
  });
  it("rechecks for a newly cheaper quote before creating order", async () => {
    const p = await seed();
    await addRate(p);
    const q = await shop.makeQuote(p.id, "standard", "110001");
    await addRate(p, { provider: "Cheaper test carrier", totalMinor: 6000 });
    await expect(
      shop.createOrder({
        quoteId: q.quote!.id,
        accessToken: randomBytes(32).toString("hex"),
        buyer,
        policiesAccepted: true,
      }),
    ).rejects.toThrow("Delivery choices changed");
  });
  it("protects private order access and payment actions", async () => {
    const p = await seed();
    await addRate(p);
    const { o, token } = await order(p);
    expect(
      (
        await req(
          "GET",
          `/api/direct/orders/${o.id}`,
          undefined,
          { "x-order-token": "0".repeat(64) },
          false,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await req(
          "GET",
          `/api/direct/orders/${o.id}`,
          undefined,
          { "x-order-token": token },
          false,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await req("POST", `/api/direct-admin/orders/${o.id}/action`, {
          action: "paid",
          detail: "123456789012",
        })
      ).status,
    ).toBe(400);
  });
  it("a customer reference never marks an order paid", async () => {
    const p = await seed();
    await addRate(p);
    const { o, token } = await order(p);
    const updated = await shop.orderAction(
      o.id,
      "reference",
      "123456789012",
      null,
      token,
    );
    expect(updated.status).toBe("payment_review");
    await expect(
      shop.orderAction(o.id, "dispatch", "AWB123", adminId),
    ).rejects.toThrow("bank credit");
  });
  it("rejects reuse of a bank credit on a second order", async () => {
    const p = await seed();
    await addRate(p);
    const first = await order(p);
    await shop.orderAction(first.o.id, "paid", "BANK123456789", adminId);
    const second = await order(await shop.product(p.id));
    await expect(
      shop.orderAction(second.o.id, "paid", "BANK123456789", adminId),
    ).rejects.toThrow("already linked");
  });
  it("cancels and restores stock exactly once", async () => {
    const p = await seed();
    await addRate(p);
    const { o } = await order(p);
    await shop.orderAction(
      o.id,
      "cancel",
      "No credit received; customer cancelled.",
      adminId,
    );
    expect((await shop.product(p.id)).variants[0]!.available).toBe(2);
    await expect(
      shop.orderAction(o.id, "cancel", "Again no bank credit.", adminId),
    ).rejects.toThrow();
  });
  it("blocks deleting an option with a reservation", async () => {
    const p = await seed();
    await addRate(p);
    await order(p);
    const latest = await shop.product(p.id);
    await expect(
      shop.saveProduct(
        p.id,
        {
          ...latest,
          variants: [{ ...latest.variants[0]!, id: "replacement" }],
        },
        adminId,
      ),
    ).rejects.toThrow("active order");
  });
  it("expires unpaid orders, but retains a payment-review reservation", async () => {
    const p = await seed();
    await addRate(p);
    const a = await order(p);
    const b = await order(await shop.product(p.id));
    await shop.orderAction(b.o.id, "reference", "123456789012", null, b.token);
    await db
      .prepare(
        "UPDATE direct_orders SET data=json_set(data,'$.reservationUntil','2020-01-01T00:00:00Z')",
      )
      .run();
    expect(await shop.expireOrders()).toBe(1);
    expect((await shop.authorisedOrder(a.o.id, a.token)).status).toBe(
      "expired",
    );
    expect((await shop.authorisedOrder(b.o.id, b.token)).status).toBe(
      "payment_review",
    );
    expect((await shop.product(p.id)).variants[0]!.available).toBe(1);
  });
  it("late payment after release goes to refund, never double-allocates stock", async () => {
    const p = await seed();
    await addRate(p);
    const { o } = await order(p);
    await db
      .prepare(
        "UPDATE direct_orders SET data=json_set(data,'$.reservationUntil','2020-01-01T00:00:00Z')",
      )
      .run();
    await shop.expireOrders();
    const exception = await shop.orderAction(
      o.id,
      "late_credit",
      "LATE123456789",
      adminId,
    );
    expect(exception.status).toBe("refund_required");
    expect((await shop.product(p.id)).variants[0]!.available).toBe(2);
    expect(
      (
        await shop.orderAction(
          o.id,
          "refunded",
          "REFUND123456789 completed",
          adminId,
        )
      ).status,
    ).toBe("refunded");
  });
  it("pausing the shop stops both listing and checkout", async () => {
    const p = await seed();
    await addRate(p);
    const q = await shop.makeQuote(p.id, "standard", "110001");
    await db
      .prepare(
        "UPDATE direct_settings SET data=json_set(data,'$.enabled',json('false'))",
      )
      .run();
    expect(
      (await req("GET", "/api/direct/products", undefined, {}, false)).data
        .products,
    ).toHaveLength(0);
    await expect(
      shop.createOrder({
        quoteId: q.quote!.id,
        accessToken: randomBytes(32).toString("hex"),
        buyer,
        policiesAccepted: true,
      }),
    ).rejects.toThrow("Shop details changed");
  });
});
