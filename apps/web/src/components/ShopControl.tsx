import { useEffect, useState, type ReactNode } from "react";
import {
  discountFacts,
  parcelKey,
  type DirectProduct,
  type ShopSettings,
} from "@dealmosaic/core";
import { apiRequest } from "../lib/api";
import {
  getShopOverview,
  orderLabel,
  rupees,
  uploadDirectMedia,
  type ShopOverview,
  type DirectOrderView,
} from "../lib/direct-api";

const blankProduct = (): DirectProduct => ({
  id: "",
  version: 0,
  title: "",
  description: "",
  category: "Handcrafts",
  materials: "",
  care: "",
  measurements: "",
  maker: "sourced",
  status: "draft",
  referenceType: "none",
  referenceMinor: 0,
  priceMinor: 10000,
  floorMinor: 10000,
  referenceEvidence: "",
  scope: "hold",
  eligibilityBasis: "",
  weightGrams: 0,
  lengthCm: 0,
  widthCm: 0,
  heightCm: 0,
  media: [],
  variants: [
    {
      id: crypto.randomUUID(),
      label: "Standard",
      available: 1,
      mode: "ready",
      leadDays: 1,
    },
  ],
  couponCode: "",
  couponOffMinor: 0,
  couponEndsAt: "",
});
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="small muted">{hint}</span>}
    </label>
  );
}
function Text({
  label,
  value,
  onChange,
  hint,
  multi = false,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  multi?: boolean;
  type?: string;
  required?: boolean;
}) {
  return (
    <Field label={label} hint={hint}>
      {multi ? (
        <textarea
          className="textarea"
          rows={4}
          maxLength={5000}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      ) : (
        <input
          className="input"
          type={type}
          value={value}
          maxLength={1000}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}
    </Field>
  );
}
function NumberField({
  label,
  value,
  onChange,
  money = false,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  money?: boolean;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        className="input"
        type="number"
        min={0}
        step={money ? ".01" : "1"}
        value={money ? value / 100 : value}
        onChange={(e) =>
          onChange(
            money
              ? Math.round(Number(e.target.value) * 100)
              : Number(e.target.value),
          )
        }
      />
    </Field>
  );
}
function DateTime({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const d = value ? new Date(value) : null;
  const local =
    d && Number.isFinite(d.getTime())
      ? new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      : "";
  return (
    <Field label={label} hint={hint}>
      <input
        className="input"
        type="datetime-local"
        value={local}
        onChange={(e) =>
          onChange(e.target.value ? new Date(e.target.value).toISOString() : "")
        }
      />
    </Field>
  );
}
export default function ShopControl() {
  const [data, setData] = useState<ShopOverview | null>(null);
  const [tab, setTab] = useState<
    "products" | "settings" | "delivery" | "orders" | "activity"
  >("products");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<DirectProduct | null>(null);
  async function reload() {
    setData(await getShopOverview());
  }
  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, []);
  async function run(fn: () => Promise<void>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      await reload();
      setMessage(success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="stack direct-admin">
      <div className="direct-admin-banner">
        <div>
          <p className="eyebrow">Your products · your pricing · your orders</p>
          <h2 className="h2">My shop</h2>
          <p>
            West Bengal dispatch · manual UPI · ready stock and made-to-order
          </p>
        </div>
        <span className="badge badge-lime">
          {data?.settings.enabled ? "Sales enabled" : "Sales paused"}
        </span>
      </div>
      <nav className="row wrap" aria-label="Shop sections">
        {(
          [
            ["products", "Products"],
            ["orders", "Orders"],
            ["delivery", "Delivery quotes"],
            ["settings", "Shop settings"],
            ["activity", "Activity"],
          ] as const
        ).map(([id, title]) => (
          <button
            className={`chip ${tab === id ? "chip-active" : ""}`}
            key={id}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => {
              if (
                editing &&
                !confirm("Leave this editor? Unsaved changes will be lost.")
              )
                return;
              setEditing(null);
              setTab(id);
            }}
          >
            {title}
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert" className="direct-notice">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="direct-notice">
          {message}
        </p>
      )}
      {!data && !error && <p role="status">Loading shop controls…</p>}
      {data && (
        <>
          {tab === "products" &&
            (editing ? (
              <ProductEditor
                key={`${editing.id || "new"}-${editing.version}`}
                initial={editing}
                busy={busy}
                onUpload={uploadDirectMedia}
                onCancel={() => {
                  if (
                    confirm("Close this editor? Unsaved changes will be lost.")
                  )
                    setEditing(null);
                }}
                onSave={(p) =>
                  run(async () => {
                    const r = await apiRequest<{ product: DirectProduct }>(
                      `/api/direct-admin/products${p.id ? `/${p.id}` : ""}`,
                      { method: p.id ? "PATCH" : "POST", body: p },
                    );
                    setEditing(r.product);
                  }, "Product saved. Only published products appear to shoppers.")
                }
              />
            ) : (
              <>
                <div
                  className="row wrap"
                  style={{ justifyContent: "space-between" }}
                >
                  <p>
                    {data.products.length} real product listings · no sample
                    stock
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => setEditing(blankProduct())}
                  >
                    + Add product
                  </button>
                </div>
                {!data.products.length && (
                  <div className="card card-lg stack">
                    <h3 className="h3">Start with your first real product</h3>
                    <p>
                      Add photos, your selling price, size options and packed
                      measurements. Save a draft without a GST number.
                      Publishing waits for seller details and sales eligibility.
                    </p>
                  </div>
                )}
                <div className="direct-grid">
                  {data.products.map((p) => (
                    <article className="card card-lg stack" key={p.id}>
                      <span className="badge badge-lime">{p.status}</span>
                      {p.media.find((m) => m.kind === "image") && (
                        <img
                          className="direct-admin-thumb"
                          alt={p.title}
                          src={`/api/direct/media/${p.media.find((m) => m.kind === "image")!.id}`}
                        />
                      )}
                      <h3 className="h3">{p.title}</h3>
                      <strong>{rupees(p.priceMinor)}</strong>
                      <p className="small">
                        {p.variants.reduce((n, v) => n + v.available, 0)}{" "}
                        available units / making slots
                      </p>
                      <button
                        className="btn btn-ghost"
                        onClick={() => setEditing(p)}
                      >
                        Edit product
                      </button>
                      {p.status === "published" && (
                        <a href={`/buy/${p.id}`} className="btn btn-ghost">
                          View listing
                        </a>
                      )}
                    </article>
                  ))}
                </div>
                <details className="card card-lg">
                  <summary>
                    Media library ·{" "}
                    {Math.round(
                      data.media.reduce((n, m) => n + m.size, 0) / 1024,
                    )}{" "}
                    KB / 20 MB
                  </summary>
                  <p className="small">
                    Remove only unused uploads. Product-linked files are
                    protected.
                  </p>
                  {data.media.map((m) => (
                    <div className="row wrap direct-media-row" key={m.id}>
                      <span className="small">
                        {m.mime} · {Math.round(m.size / 1024)} KB ·{" "}
                        {m.id.slice(0, 8)}
                      </span>
                      <button
                        className="btn btn-ghost"
                        disabled={busy}
                        onClick={() => {
                          if (confirm("Delete this unused upload?"))
                            void run(async () => {
                              await apiRequest(
                                `/api/direct-admin/media/${m.id}`,
                                { method: "DELETE" },
                              );
                            }, "Unused upload deleted.");
                        }}
                      >
                        Delete unused file
                      </button>
                    </div>
                  ))}
                </details>
              </>
            ))}
          {tab === "settings" && (
            <SettingsEditor
              key={data.settingsVersion}
              initial={data.settings}
              busy={busy}
              onSave={(s) =>
                run(async () => {
                  await apiRequest("/api/direct-admin/settings", {
                    method: "POST",
                    body: { ...s, version: data.settingsVersion },
                  });
                }, "Shop settings saved.")
              }
            />
          )}
          {tab === "delivery" && (
            <>
              <div className="direct-notice">
                <strong>Carrier APIs are not connected.</strong>
                <p>
                  The selector compares current, carrier-confirmed quotes
                  entered below. It does not guess delivery from the PIN or
                  claim to compare all of India. Payment is blocked without a
                  matching confirmed quote.
                </p>
                <p>
                  No carrier booking, wallet top-up or paid service is
                  activated. Origin PIN, exact packed measurements and actual
                  carrier access are needed for live API integration.
                </p>
              </div>
              <div className="card card-lg stack">
                <h3 className="h3">PIN checks awaiting confirmation</h3>
                <p className="small muted">
                  Recent delivery checks, not orders. No buyer address is
                  collected here. Confirmed results clear the matching entry.
                </p>
                {data.deliveryChecks.length === 0 ? (
                  <p>No pending PIN checks.</p>
                ) : (
                  data.deliveryChecks.map((d) => (
                    <p key={d.product_id + d.destination_pin}>
                      <strong>{d.destination_pin}</strong> ·{" "}
                      {data.products.find((p) => p.id === d.product_id)
                        ?.title ?? d.product_id}{" "}
                      · {d.checks} checks
                    </p>
                  ))
                )}
              </div>
              <RateEditor
                data={data}
                busy={busy}
                onSave={(r) =>
                  run(async () => {
                    await apiRequest("/api/direct-admin/rates", {
                      method: "POST",
                      body: r,
                    });
                  }, "Delivery result recorded. The lowest eligible all-in quote will be selected automatically.")
                }
              />
              <div className="stack">
                {data.rates.map((r) => (
                  <article className="card card-lg stack" key={r.id}>
                    <h3 className="h3">
                      {r.provider} · {r.service}
                    </h3>
                    <p>
                      {r.originPin} → {r.destinationPin} · {r.destinationState}
                      <br />
                      {r.serviceable
                        ? `${rupees(r.totalMinor)} all-in · ${r.pickupWaitDays + r.transitDays} days excluding preparation`
                        : "Not serviceable"}
                    </p>
                    <p className="small">
                      Valid until{" "}
                      {new Date(r.expiresAt).toLocaleString("en-IN")} · parcel{" "}
                      {r.parcelKey}
                    </p>
                    <button
                      className="btn btn-ghost"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await apiRequest(`/api/direct-admin/rates/${r.id}`, {
                            method: "DELETE",
                          });
                        }, "Quote removed. Existing orders retain their recorded selection.")
                      }
                    >
                      Withdraw quote
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
          {tab === "orders" && (
            <>
              <p className="direct-notice">
                Bank credit—not a screenshot—confirms payment. Carrier selection
                is recorded on each order; book that service yourself. Refund
                recording does not send money.
              </p>
              <p>
                {data.orders.length} most recent orders. Payment-review orders
                stay reserved until you reconcile them.
              </p>
              {data.orders.map((o) => (
                <AdminOrder
                  key={o.id + o.status}
                  order={o}
                  busy={busy}
                  onAction={(
                    action,
                    detail,
                    bankCreditChecked,
                    selectedCarrierUsed,
                  ) =>
                    run(async () => {
                      await apiRequest(
                        `/api/direct-admin/orders/${o.id}/action`,
                        {
                          method: "POST",
                          body: {
                            action,
                            detail,
                            bankCreditChecked,
                            selectedCarrierUsed,
                          },
                        },
                      );
                    }, "Order updated and recorded in the shop activity log.")
                  }
                />
              ))}
              {!data.orders.length && (
                <div className="card card-lg">
                  <h3 className="h3">No direct orders yet</h3>
                  <p>
                    Real orders will appear here with the chosen carrier, exact
                    payable amount and buyer address.
                  </p>
                </div>
              )}
            </>
          )}
          {tab === "activity" && (
            <div className="card card-lg stack">
              <h3 className="h3">Shop activity</h3>
              {data.events.map((e) => (
                <div key={e.id} className="direct-media-row">
                  <strong>{e.action.replaceAll("_", " ")}</strong>
                  <p className="small direct-break">
                    {new Date(e.at).toLocaleString("en-IN")} · {e.entity_id}
                  </p>
                </div>
              ))}
              {!data.events.length && <p>No shop changes recorded yet.</p>}
            </div>
          )}
        </>
      )}
    </section>
  );
}
function ProductEditor({
  initial,
  busy,
  onSave,
  onCancel,
  onUpload,
}: {
  initial: DirectProduct;
  busy: boolean;
  onSave: (p: DirectProduct) => void;
  onCancel: () => void;
  onUpload: typeof uploadDirectMedia;
}) {
  const [p, setP] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof DirectProduct>(k: K, value: DirectProduct[K]) =>
    setP((p) => ({ ...p, [k]: value }));
  const discount =
    p.referenceType !== "none"
      ? discountFacts(p.referenceMinor, p.priceMinor)
      : null;
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, []);
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(p);
      }}
    >
      <div className="row wrap">
        <h3 className="h2">{p.id ? "Edit product" : "Add a product"}</h3>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Close editor
        </button>
      </div>
      {error && (
        <p className="direct-notice" role="alert">
          {error}
        </p>
      )}
      <section className="card card-lg stack">
        <p className="eyebrow">01 · Show the real product</p>
        <Text
          label="Product title"
          required
          value={p.title}
          onChange={(v) => set("title", v)}
        />
        <Text
          label="Description"
          multi
          value={p.description}
          onChange={(v) => set("description", v)}
        />
        <div className="field-row">
          <Text
            label="Category"
            value={p.category}
            onChange={(v) => set("category", v)}
          />
          <Field label="Sourcing">
            <select
              className="select"
              value={p.maker}
              onChange={(e) =>
                set("maker", e.target.value as DirectProduct["maker"])
              }
            >
              <option value="sourced">
                Acquired from vendors; I am the seller
              </option>
              <option value="self">Made by me</option>
            </select>
          </Field>
        </div>
        <label className="field">
          Add real photos or a short video
          <input
            className="input"
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            disabled={uploading || p.media.length >= 8}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setUploading(true);
              setError("");
              try {
                const m = await onUpload(f);
                setP((p) => ({
                  ...p,
                  media: [
                    ...p.media,
                    {
                      id: m.id,
                      kind: m.kind,
                      alt: p.title || "Product detail",
                    },
                  ],
                }));
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setUploading(false);
                e.target.value = "";
              }
            }}
          />
          <span className="small muted">
            Up to 8 files. Photos: 4 MB input, compressed with location metadata
            removed. MP4/WebM videos: 3 MB maximum; remove private
            audio/location metadata before upload. Persistent storage, 20 MB
            total cap.
          </span>
        </label>
        {uploading && <p role="status">Processing upload…</p>}
        <div className="direct-media-grid">
          {p.media.map((m, i) => (
            <div key={m.id} className="stack">
              {m.kind === "image" ? (
                <img src={`/api/direct/media/${m.id}`} alt={m.alt} />
              ) : (
                <video
                  src={`/api/direct/media/${m.id}`}
                  controls
                  playsInline
                  preload="metadata"
                />
              )}
              <Text
                label="Description / accessibility text"
                value={m.alt}
                onChange={(v) =>
                  set(
                    "media",
                    p.media.map((m, j) => (j === i ? { ...m, alt: v } : m)),
                  )
                }
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  set(
                    "media",
                    p.media.filter((_, j) => i !== j),
                  )
                }
              >
                Remove from product
              </button>
            </div>
          ))}
        </div>
        <div className="direct-form-grid">
          <Text
            label="Materials"
            multi
            value={p.materials}
            onChange={(v) => set("materials", v)}
          />
          <Text
            label="Measurements / size guide"
            multi
            value={p.measurements}
            onChange={(v) => set("measurements", v)}
          />
          <Text
            label="Care instructions"
            multi
            value={p.care}
            onChange={(v) => set("care", v)}
          />
        </div>
      </section>
      <section className="card card-lg stack">
        <p className="eyebrow">02 · Your price, calculated honestly</p>
        <div className="direct-form-grid">
          <Field label="Reference-price basis">
            <select
              className="select"
              value={p.referenceType}
              onChange={(e) =>
                set(
                  "referenceType",
                  e.target.value as DirectProduct["referenceType"],
                )
              }
            >
              <option value="none">
                No reference price / no discount claim
              </option>
              <option value="mrp">Genuine MRP on the product</option>
              <option value="previous">Genuine previous selling price</option>
            </select>
          </Field>
          <NumberField
            label="Reference price (₹)"
            money
            value={p.referenceMinor}
            onChange={(v) => set("referenceMinor", v)}
          />
          <NumberField
            label="Selling price (₹) — buyer pays for the item"
            money
            value={p.priceMinor}
            onChange={(v) =>
              setP((p) => ({
                ...p,
                priceMinor: v,
                floorMinor: p.floorMinor === p.priceMinor ? v : p.floorMinor,
              }))
            }
          />
          <NumberField
            label="Minimum item price after a coupon (₹)"
            money
            value={p.floorMinor}
            onChange={(v) => set("floorMinor", v)}
            hint="Private safeguard. Defaults to your selling price; shipping is added, not taken out of this amount."
          />
        </div>
        <Text
          label="Reference-price evidence (private)"
          value={p.referenceEvidence}
          onChange={(v) => set("referenceEvidence", v)}
          hint="For example: package MRP and supplier invoice reference, or dated records of the previous actual selling price. Never invent an inflated MRP."
        />
        <div className="direct-price-preview">
          <span>Buyer-facing price preview</span>
          <strong className="direct-price">{rupees(p.priceMinor)}</strong>
          {discount && (
            <span className="direct-saving">
              Save {rupees(discount.savingMinor)}
              {discount.percent > 0 ? ` · ${discount.percent}% off` : ""}
            </span>
          )}
          <span className="small">+ confirmed delivery charge at checkout</span>
        </div>
        <details>
          <summary>Optional coupon</summary>
          <div className="stack">
            <Text
              label="Coupon code"
              value={p.couponCode}
              onChange={(v) => set("couponCode", v.toUpperCase())}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                set(
                  "couponCode",
                  `DM${Array.from(
                    crypto.getRandomValues(new Uint8Array(4)),
                    (n) => n.toString(16).padStart(2, "0"),
                  )
                    .join("")
                    .toUpperCase()}`,
                )
              }
            >
              Generate code
            </button>
            <NumberField
              label="Extra fixed coupon saving (₹)"
              money
              value={p.couponOffMinor}
              onChange={(v) => set("couponOffMinor", v)}
            />
            <DateTime
              label="Coupon expires (your local date and time)"
              value={p.couponEndsAt}
              onChange={(v) => set("couponEndsAt", v)}
              hint="A code applies only to this product and cannot stack or go below your minimum."
            />
          </div>
        </details>
      </section>
      <section className="card card-lg stack">
        <p className="eyebrow">03 · Options & available stock</p>
        {p.variants.map((v, i) => (
          <div className="direct-variant stack" key={v.id}>
            <Text
              label="Option (size / colour)"
              value={v.label}
              onChange={(label) =>
                set(
                  "variants",
                  p.variants.map((v, j) => (j === i ? { ...v, label } : v)),
                )
              }
            />
            <div className="direct-form-grid">
              <Field label="Fulfilment">
                <select
                  className="select"
                  value={v.mode}
                  onChange={(e) =>
                    set(
                      "variants",
                      p.variants.map((v, j) =>
                        j === i
                          ? { ...v, mode: e.target.value as "ready" | "made" }
                          : v,
                      ),
                    )
                  }
                >
                  <option value="ready">Ready stock</option>
                  <option value="made">Made to order</option>
                </select>
              </Field>
              <NumberField
                label={
                  v.mode === "made"
                    ? "Available making slots"
                    : "Available pieces"
                }
                value={v.available}
                onChange={(available) =>
                  set(
                    "variants",
                    p.variants.map((v, j) =>
                      j === i ? { ...v, available } : v,
                    ),
                  )
                }
              />
              <NumberField
                label="Preparation / making days"
                value={v.leadDays}
                onChange={(leadDays) =>
                  set(
                    "variants",
                    p.variants.map((v, j) =>
                      j === i ? { ...v, leadDays } : v,
                    ),
                  )
                }
              />
            </div>
            {p.variants.length > 1 && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  set(
                    "variants",
                    p.variants.filter((_, j) => i !== j),
                  )
                }
              >
                Remove option
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost"
          disabled={p.variants.length >= 20}
          onClick={() =>
            set("variants", [
              ...p.variants,
              {
                id: crypto.randomUUID(),
                label: "New option",
                available: 0,
                mode: "ready",
                leadDays: 1,
              },
            ])
          }
        >
          + Add size / colour
        </button>
        <p className="small muted">
          Use the largest packed measurements below if these options differ. For
          different parcel sizes, use separate listings so shipping stays
          accurate.
        </p>
      </section>
      <section className="card card-lg stack">
        <p className="eyebrow">04 · Packed parcel & sales eligibility</p>
        <div className="direct-form-grid">
          <NumberField
            label="Packed weight (grams)"
            value={p.weightGrams}
            onChange={(v) => set("weightGrams", v)}
          />
          <NumberField
            label="Length (cm)"
            value={p.lengthCm}
            onChange={(v) => set("lengthCm", v)}
          />
          <NumberField
            label="Width (cm)"
            value={p.widthCm}
            onChange={(v) => set("widthCm", v)}
          />
          <NumberField
            label="Height (cm)"
            value={p.heightCm}
            onChange={(v) => set("heightCm", v)}
          />
        </div>
        <Field label="Confirmed sales area">
          <select
            className="select"
            value={p.scope}
            onChange={(e) =>
              set("scope", e.target.value as DirectProduct["scope"])
            }
          >
            <option value="hold">Hold — eligibility not established</option>
            <option value="west_bengal">
              West Bengal only — basis confirmed
            </option>
            <option value="india">
              India — interstate eligibility confirmed
            </option>
          </select>
        </Field>
        <Text
          label="Product eligibility basis (private)"
          multi
          value={p.eligibilityBasis}
          onChange={(v) => set("eligibilityBasis", v)}
          hint="Record the actual product classification, applicable basis, reviewer and date. Reselling a handmade item does not automatically establish an interstate GST exemption. No GSTIN is requested."
        />
        <Field label="Listing status">
          <select
            className="select"
            value={p.status}
            onChange={(e) =>
              set("status", e.target.value as DirectProduct["status"])
            }
          >
            <option value="draft">Draft — only visible to you</option>
            <option value="published">Published — visible to shoppers</option>
            <option value="archived">Archived — hidden from shoppers</option>
          </select>
        </Field>
      </section>
      <div className="direct-savebar">
        <button className="btn btn-primary" disabled={busy || uploading}>
          {busy ? "Saving…" : "Save product"}
        </button>
        <span className="small">
          No GSTIN needed for drafts. No fabricated listings.
        </span>
      </div>
    </form>
  );
}
function SettingsEditor({
  initial,
  busy,
  onSave,
}: {
  initial: ShopSettings;
  busy: boolean;
  onSave: (s: ShopSettings) => void;
}) {
  const [s, setS] = useState(initial);
  const text = (
    key: keyof ShopSettings,
    label: string,
    multi = false,
    hint?: string,
  ) => (
    <Text
      key={key}
      label={label}
      value={String(s[key])}
      onChange={(v) => setS({ ...s, [key]: v })}
      multi={multi}
      hint={hint}
    />
  );
  return (
    <form
      className="card card-lg stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(s);
      }}
    >
      <h3 className="h2">One-time shop setup</h3>
      <p className="direct-notice">
        You are the seller, even when sourcing from vendors. Buyers pay your UPI
        account. Seller details and policies are shown before purchase. GST
        status: not registered.
      </p>
      <div className="direct-form-grid">
        {text("sellerName", "Actual seller / receipt name")}
        {text("payeeName", "Bank / UPI recipient name")}
        {text("originPin", "West Bengal dispatch PIN")}
        {text("upiId", "UPI ID — not your bank password")}
        {text("supportEmail", "Customer-care email")}
        {text("supportPhone", "Customer-care phone")}
        {text("grievanceName", "Grievance contact name")}
        {text("sellerAddress", "Seller / business address", true)}
      </div>
      {text(
        "shippingPolicy",
        "Shipping policy",
        true,
        "Explain preparation time, pickup waits, estimated transit time, manual payment checks and support for delays.",
      )}
      {text(
        "returnsPolicy",
        "Returns, exchanges and refunds",
        true,
        "State the time limits and process. Do not exclude remedies for defective or incorrectly supplied goods.",
      )}
      {text(
        "eligibilityBasis",
        "Reviewed business eligibility (private)",
        true,
        "Record the applicable threshold, aggregate turnover including relevant affiliate income, seller structure, reviewer and date. Nationwide serviceability does not settle interstate GST eligibility.",
      )}
      <label className="row">
        <input
          type="checkbox"
          checked={s.enabled}
          onChange={(e) => setS({ ...s, enabled: e.target.checked })}
        />
        <span>
          Enable direct sales after setup and eligibility are complete
        </span>
      </label>
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "Saving…" : "Save shop settings"}
      </button>
      <p className="small muted">
        Keeping sales paused still allows you to prepare drafts. No paid service
        or courier booking is activated by this form.
      </p>
    </form>
  );
}
function RateEditor({
  data,
  busy,
  onSave,
}: {
  data: ShopOverview;
  busy: boolean;
  onSave: (r: unknown) => void;
}) {
  const [r, setR] = useState({
    productId: data.products[0]?.id ?? "",
    originPin: data.settings.originPin,
    destinationPin: "",
    destinationState: "",
    provider: "",
    service: "",
    serviceable: true,
    totalMinor: 0,
    transitDays: 10,
    pickupWaitDays: 0,
    expiresAt: "",
    evidence: "",
    allChargesConfirmed: false,
  });
  const p = data.products.find((p) => p.id === r.productId);
  return (
    <form
      className="card card-lg stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(r);
      }}
    >
      <h3 className="h3">Record a carrier-confirmed result</h3>
      <Field label="Product / one packed unit">
        <select
          className="select"
          required
          value={r.productId}
          onChange={(e) => setR({ ...r, productId: e.target.value })}
        >
          <option value="">Choose product</option>
          {data.products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </Field>
      {p && (
        <p className="small">
          Parcel: {p.weightGrams} g · {p.lengthCm} × {p.widthCm} × {p.heightCm}{" "}
          cm · {parcelKey(p)}
        </p>
      )}
      <div className="direct-form-grid">
        {(
          [
            "originPin",
            "destinationPin",
            "destinationState",
            "provider",
            "service",
          ] as const
        ).map((k) => (
          <Text
            key={k}
            label={
              {
                originPin: "Dispatch PIN",
                destinationPin: "Buyer PIN",
                destinationState: "Destination state from carrier",
                provider: "Carrier / provider",
                service: "Exact bookable service",
              }[k]
            }
            value={r[k]}
            onChange={(v) => setR({ ...r, [k]: v })}
            required
          />
        ))}
        <NumberField
          label="Total shipping charge (₹) including all taxes / fees"
          money
          value={r.totalMinor}
          onChange={(v) => setR({ ...r, totalMinor: v })}
        />
        <NumberField
          label="Carrier transit estimate (days)"
          value={r.transitDays}
          onChange={(v) => setR({ ...r, transitDays: v })}
        />
        <NumberField
          label="Wait until eligible pickup (days)"
          value={r.pickupWaitDays}
          onChange={(v) => setR({ ...r, pickupWaitDays: v })}
        />
      </div>
      <DateTime
        label="Quote expiry (local date and time, at most 7 days)"
        value={r.expiresAt}
        onChange={(v) => setR({ ...r, expiresAt: v })}
        hint="Use the provider's actual validity. Do not assume a weekly departure exists."
      />
      <Text
        label="Confirmation evidence / reference (private)"
        multi
        required
        value={r.evidence}
        onChange={(v) => setR({ ...r, evidence: v })}
        hint="Record the quote/reference, date and source. Include pickup, delivery, actual/volumetric weight, taxes, remote-area fees and account eligibility."
      />
      <label className="row">
        <input
          type="checkbox"
          checked={r.serviceable}
          onChange={(e) => setR({ ...r, serviceable: e.target.checked })}
        />
        This exact parcel and route is serviceable
      </label>
      <label className="row">
        <input
          type="checkbox"
          required
          checked={r.allChargesConfirmed}
          onChange={(e) =>
            setR({ ...r, allChargesConfirmed: e.target.checked })
          }
        />
        I checked this result with the carrier. For a serviceable result, the
        amount includes all applicable charges and the service is bookable.
      </label>
      <button
        className="btn btn-primary"
        disabled={busy || !data.settings.originPin || !data.products.length}
      >
        Save confirmed result
      </button>
    </form>
  );
}
function AdminOrder({
  order: o,
  busy,
  onAction,
}: {
  order: DirectOrderView;
  busy: boolean;
  onAction: (
    action: string,
    detail: string,
    bank: boolean,
    carrier: boolean,
  ) => void;
}) {
  const [action, setAction] = useState("");
  const [detail, setDetail] = useState("");
  const [bank, setBank] = useState(false);
  const [carrier, setCarrier] = useState(false);
  const actions = ["awaiting_payment", "payment_review"].includes(o.status)
    ? [
        ["paid", "Verify actual bank credit"],
        ["cancel", "Cancel after reconciliation"],
      ]
    : o.status === "paid"
      ? [
          ["dispatch", "Record dispatch"],
          ["refunded", "Record completed full refund"],
        ]
      : o.status === "dispatched"
        ? [
            ["delivered", "Confirm delivery"],
            ["refunded", "Record completed full refund"],
          ]
        : ["delivered", "refund_required"].includes(o.status)
          ? [["refunded", "Record completed full refund"]]
          : ["expired", "cancelled"].includes(o.status)
            ? [["late_credit", "Record a late bank credit for refund"]]
            : [];
  return (
    <article className="card card-lg stack">
      <span className="badge badge-lime">{orderLabel(o.status)}</span>
      <h3 className="h3">
        {o.title} · {o.option}
      </h3>
      <p className="small direct-break">
        {o.id} · {new Date(o.createdAt).toLocaleString("en-IN")}
      </p>
      <strong className="direct-price">{rupees(o.totals.totalMinor)}</strong>
      <p>
        Item {rupees(o.totals.itemMinor)} + delivery{" "}
        {rupees(o.totals.shippingMinor)}
        <br />
        <strong>
          {o.rate.provider} · {o.rate.service}
        </strong>
        <br />
        Selected quote: {o.rate.evidence}
        <br />
        Estimated {o.deliveryDays} days, including making and pickup wait.
      </p>
      <p className="direct-prewrap">
        {o.buyer.name} · {o.buyer.phone} · {o.buyer.email}
        <br />
        {o.buyer.address}
        <br />
        {o.buyer.city}, {o.buyer.state}, {o.buyer.pincode}
      </p>
      {o.customerReference && (
        <p>Customer-submitted reference (not proof): {o.customerReference}</p>
      )}
      {o.tracking && <p>Tracking reference: {o.tracking}</p>}
      {actions.length > 0 && (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              confirm(
                "Apply this order action? It is recorded in the audit trail.",
              )
            )
              onAction(action, detail, bank, carrier);
          }}
        >
          <Field label="Next action">
            <select
              className="select"
              required
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setBank(false);
                setCarrier(false);
                setDetail("");
              }}
            >
              <option value="">Choose action</option>
              {actions.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Text
            label={
              action === "paid" || action === "late_credit"
                ? "Actual bank-credit reference"
                : action === "dispatch"
                  ? "Tracking / AWB reference"
                  : action === "refunded"
                    ? "Completed full refund reference"
                    : "Reconciliation / cancellation reason"
            }
            required
            value={detail}
            onChange={setDetail}
          />
          {(action === "paid" || action === "late_credit") && (
            <label className="row">
              <input
                type="checkbox"
                required
                checked={bank}
                onChange={(e) => setBank(e.target.checked)}
              />
              I matched this order's exact amount to a genuine credit in my bank
              account.
            </label>
          )}
          {action === "dispatch" && (
            <label className="row">
              <input
                type="checkbox"
                required
                checked={carrier}
                onChange={(e) => setCarrier(e.target.checked)}
              />
              I booked {o.rate.provider} — {o.rate.service}, as selected. I have
              not charged the customer an unagreed increase.
            </label>
          )}
          <button className="btn btn-primary" disabled={busy || !action}>
            Record action
          </button>
        </form>
      )}
    </article>
  );
}
