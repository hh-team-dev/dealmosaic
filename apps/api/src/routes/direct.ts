import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import sharp from "sharp";
import { z } from "zod";
import type { AppBindings } from "../middleware/session.js";
import {
  requireUser,
  requireAdmin,
  requireCsrf,
} from "../middleware/session.js";
import {
  assertSameOrigin,
  badRequest,
  conflict,
  notFound,
} from "../lib/http.js";
import { createRateLimiter } from "../lib/rate-limit.js";
import { db, newId, nowIso } from "../db/index.js";
import * as shop from "../services/direct-shop.js";

export const directRoutes = new Hono<AppBindings>();
export const directAdminRoutes = new Hono<AppBindings>();
const smallBody = bodyLimit({
  maxSize: 32 * 1024,
  onError: (c) =>
    c.json(
      { error: { code: "too_large", message: "This request is too large." } },
      413,
    ),
});
directRoutes.use("*", smallBody);
directRoutes.use("*", async (c, next) => {
  if (c.req.method !== "GET") assertSameOrigin(c);
  await next();
});
directRoutes.get("/products", async (c) => {
  const s = await shop.settings();
  if (!s.enabled) return c.json({ products: [], seller: null });
  return c.json({
    products: (await shop.products())
      .filter((p) => p.status === "published")
      .map(shop.publicProduct),
    seller: {
      name: s.sellerName,
      address: s.sellerAddress,
      email: s.supportEmail,
      phone: s.supportPhone,
      grievanceName: s.grievanceName,
      originState: s.originState,
      returnsPolicy: s.returnsPolicy,
      shippingPolicy: s.shippingPolicy,
    },
  });
});
directRoutes.get("/products/:id", async (c) => {
  const s = await shop.settings();
  const p = await shop.product(c.req.param("id"));
  if (!s.enabled || p.status !== "published") throw notFound();
  return c.json({
    product: shop.publicProduct(p),
    seller: {
      name: s.sellerName,
      address: s.sellerAddress,
      email: s.supportEmail,
      phone: s.supportPhone,
      grievanceName: s.grievanceName,
      returnsPolicy: s.returnsPolicy,
      shippingPolicy: s.shippingPolicy,
    },
  });
});
directRoutes.get("/media/:id", async (c) => {
  const id = c.req.param("id");
  if (!z.string().uuid().safeParse(id).success) throw notFound();
  const user = c.get("user");
  const admin = user && (user.role === "admin" || user.role === "super_admin");
  if (!admin) {
    const s = await shop.settings();
    if (
      !s.enabled ||
      !(await db
        .prepare(
          "SELECT id FROM direct_products WHERE status='published' AND data LIKE ? LIMIT 1",
        )
        .get(`%${id}%`))
    )
      throw notFound();
  }
  const r = await db
    .prepare("SELECT mime,bytes FROM direct_media WHERE id=?")
    .get(id);
  if (!r) throw notFound();
  const bytes = Buffer.from(r.bytes as ArrayBuffer);
  c.header("Content-Type", String(r.mime));
  c.header("Content-Security-Policy", "default-src 'none'; sandbox");
  c.header("Accept-Ranges", "bytes");
  const range = c.req.header("range");
  if (range) {
    const m = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!m) {
      c.header("Content-Range", `bytes */${bytes.length}`);
      return c.body(null, 416);
    }
    const start = Number(m[1]);
    const end = m[2]
      ? Math.min(Number(m[2]), bytes.length - 1)
      : bytes.length - 1;
    if (start > end || start >= bytes.length) {
      c.header("Content-Range", `bytes */${bytes.length}`);
      return c.body(null, 416);
    }
    c.header("Content-Range", `bytes ${start}-${end}/${bytes.length}`);
    return c.body(new Uint8Array(bytes.subarray(start, end + 1)), 206);
  }
  return c.body(new Uint8Array(bytes));
});
directRoutes.post(
  "/quote",
  createRateLimiter({ name: "direct-quote", windowMs: 60000, max: 15 }),
  async (c) => {
    const b = shop.parsed(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().min(1).max(50),
        pincode: z.string().regex(/^[1-9]\d{5}$/),
        code: z.string().max(32).default(""),
      }),
      await c.req.json().catch(() => null),
    );
    return c.json(
      await shop.makeQuote(b.productId, b.variantId, b.pincode, b.code),
    );
  },
);
directRoutes.post(
  "/orders",
  createRateLimiter({ name: "direct-order", windowMs: 3600000, max: 5 }),
  async (c) =>
    c.json(
      {
        order: shop.publicOrder(
          await shop.createOrder(await c.req.json().catch(() => null)),
        ),
      },
      201,
    ),
);
directRoutes.get("/orders/:id", async (c) =>
  c.json({
    order: shop.publicOrder(
      await shop.authorisedOrder(
        c.req.param("id"),
        c.req.header("x-order-token") ?? "",
      ),
    ),
  }),
);
directRoutes.post(
  "/orders/:id/reference",
  createRateLimiter({ name: "direct-reference", windowMs: 60000, max: 8 }),
  async (c) => {
    const b = shop.parsed(
      z.object({ reference: z.string().min(10).max(35) }),
      await c.req.json().catch(() => null),
    );
    return c.json({
      order: shop.publicOrder(
        await shop.orderAction(
          c.req.param("id"),
          "reference",
          b.reference,
          null,
          c.req.header("x-order-token"),
        ),
      ),
    });
  },
);

directAdminRoutes.use("*", requireUser, requireAdmin);
directAdminRoutes.use("*", async (c, next) => {
  if (c.req.method !== "GET") {
    assertSameOrigin(c);
    await requireCsrf(c, next);
  } else await next();
});
directAdminRoutes.use(
  "*",
  bodyLimit({
    maxSize: 5 * 1024 * 1024,
    onError: (c) =>
      c.json(
        {
          error: {
            code: "too_large",
            message: "Use photos up to 4 MB or short videos up to 3 MB.",
          },
        },
        413,
      ),
  }),
);
directAdminRoutes.get("/overview", async (c) => {
  const orders = (
    await db
      .prepare(
        "SELECT data FROM direct_orders ORDER BY created_at DESC LIMIT 100",
      )
      .all()
  ).map((r) => JSON.parse(String(r.data)));
  return c.json({
    settings: await shop.settings(),
    settingsVersion: Number(
      (await db.prepare("SELECT version FROM direct_settings WHERE id=1").get())
        ?.version ?? 0,
    ),
    products: await shop.products(),
    rates: await shop.rates(),
    orders,
    media: await db
      .prepare(
        "SELECT id,mime,size FROM direct_media ORDER BY created_at DESC LIMIT 200",
      )
      .all(),
    events: await db
      .prepare("SELECT * FROM direct_events ORDER BY at DESC LIMIT 50")
      .all(),
    deliveryChecks: await db
      .prepare(
        "SELECT * FROM direct_delivery_checks ORDER BY last_checked DESC LIMIT 200",
      )
      .all(),
    deliveryMode: "confirmed_quotes_only",
    carrierApiConnected: false,
  });
});
directAdminRoutes.post("/settings", smallBody, async (c) => {
  const body = await c.req.json().catch(() => null);
  const s = shop.parsed(shop.settingsSchema, body);
  const version = shop.parsed(z.number().int().min(0), body?.version);
  await db.transaction(async (tx) => {
    const row = await tx
      .prepare("SELECT version FROM direct_settings WHERE id=1")
      .get();
    if (Number(row?.version ?? 0) !== version)
      throw conflict("Settings changed in another tab. Reload before saving.");
    await tx
      .prepare(
        "INSERT INTO direct_settings(id,data,version) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=excluded.version",
      )
      .run(JSON.stringify(s), version + 1);
    await shop.event(tx, c.get("user")!.id, "shop", "settings_saved", {
      enabled: s.enabled,
      version: version + 1,
    });
  });
  return c.json({ settings: s, version: version + 1 });
});
directAdminRoutes.post("/products", smallBody, async (c) =>
  c.json(
    {
      product: await shop.saveProduct(
        newId(),
        await c.req.json().catch(() => null),
        c.get("user")!.id,
      ),
    },
    201,
  ),
);
directAdminRoutes.patch("/products/:id", smallBody, async (c) => {
  if (!z.string().uuid().safeParse(c.req.param("id")).success) throw notFound();
  return c.json({
    product: await shop.saveProduct(
      c.req.param("id"),
      await c.req.json().catch(() => null),
      c.get("user")!.id,
    ),
  });
});
directAdminRoutes.post("/rates", smallBody, async (c) =>
  c.json(
    {
      rate: await shop.saveRate(
        await c.req.json().catch(() => null),
        c.get("user")!.id,
      ),
    },
    201,
  ),
);
directAdminRoutes.delete("/rates/:id", async (c) => {
  await db.transaction(async (tx) => {
    await tx
      .prepare("DELETE FROM direct_rates WHERE id=?")
      .run(c.req.param("id"));
    await shop.event(tx, c.get("user")!.id, c.req.param("id"), "rate_removed");
  });
  return c.json({ ok: true });
});
directAdminRoutes.post("/media", async (c) => {
  const contentType = c.req.header("content-type") ?? "";
  let bytes = Buffer.from(await c.req.arrayBuffer());
  let mime: string;
  if (contentType.startsWith("image/")) {
    if (bytes.length > 4 * 1024 * 1024)
      throw badRequest("The photo must be below 4 MB.");
    try {
      bytes = await sharp(bytes, {
        limitInputPixels: 20_000_000,
        animated: false,
      })
        .rotate()
        .resize({
          width: 1400,
          height: 1400,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();
    } catch {
      throw badRequest("Use a readable JPEG, PNG or WebP photo.");
    }
    if (bytes.length > 600 * 1024)
      throw badRequest(
        "This photo is too detailed. Resize it before uploading.",
      );
    mime = "image/webp";
  } else if (contentType === "video/mp4" || contentType === "video/webm") {
    if (bytes.length > 3 * 1024 * 1024 || bytes.length < 32)
      throw badRequest("Use a short video below 3 MB.");
    const mp4 = bytes.toString("ascii", 4, 8) === "ftyp";
    const webm = bytes
      .subarray(0, 4)
      .equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    if (
      (contentType === "video/mp4" && !mp4) ||
      (contentType === "video/webm" && !webm)
    )
      throw badRequest("The video format does not match its contents.");
    mime = contentType;
  } else throw badRequest("Use a photo, MP4 or WebM video.");
  const id = newId();
  await db.transaction(async (tx) => {
    const used = Number(
      (
        await tx
          .prepare("SELECT COALESCE(SUM(size),0) AS n FROM direct_media")
          .get()
      )?.n ?? 0,
    );
    if (used + bytes.length > 20 * 1024 * 1024)
      throw badRequest(
        "The 20 MB media budget is full. Remove unused uploads before adding more. No paid storage is activated.",
      );
    await tx
      .prepare(
        "INSERT INTO direct_media(id,mime,bytes,size,created_at) VALUES(?,?,?,?,?)",
      )
      .run(id, mime, bytes, bytes.length, nowIso());
    await shop.event(tx, c.get("user")!.id, id, "media_uploaded", {
      mime,
      size: bytes.length,
    });
  });
  return c.json(
    {
      id,
      kind: mime.startsWith("image/") ? "image" : "video",
      size: bytes.length,
    },
    201,
  );
});
directAdminRoutes.delete("/media/:id", async (c) => {
  const id = c.req.param("id");
  await db.transaction(async (tx) => {
    if (
      await tx
        .prepare("SELECT id FROM direct_products WHERE data LIKE ? LIMIT 1")
        .get(`%${id}%`)
    )
      throw conflict(
        "Remove this upload from product records before deleting it.",
      );
    await tx.prepare("DELETE FROM direct_media WHERE id=?").run(id);
    await shop.event(tx, c.get("user")!.id, id, "media_deleted");
  });
  return c.json({ ok: true });
});
directAdminRoutes.post("/orders/:id/action", smallBody, async (c) => {
  const b = shop.parsed(
    z.object({
      action: z.enum([
        "paid",
        "dispatch",
        "delivered",
        "cancel",
        "refunded",
        "late_credit",
      ]),
      detail: z.string().trim().max(1000),
      bankCreditChecked: z.boolean().optional(),
      selectedCarrierUsed: z.boolean().optional(),
    }),
    await c.req.json().catch(() => null),
  );
  if (
    (b.action === "paid" || b.action === "late_credit") &&
    !b.bankCreditChecked
  )
    throw badRequest("Confirm that you matched the actual bank credit.");
  if (b.action === "dispatch" && !b.selectedCarrierUsed)
    throw badRequest("Confirm you booked the selected carrier and service.");
  return c.json({
    order: await shop.orderAction(
      c.req.param("id"),
      b.action,
      b.detail,
      c.get("user")!.id,
    ),
  });
});
