import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Chrome } from "../components/PublicChrome";
import { DirectCard } from "../components/DirectShelf";
import { Seo } from "../lib/seo";
import { apiRequest } from "../lib/api";
import {
  getDirectProducts,
  newOrderToken,
  orderLabel,
  rupees,
  type DirectOrderView,
  type DirectQuote,
  type PublicDirectProduct,
  type Seller,
} from "../lib/direct-api";

function ErrorBox({ message }: { message: string }) {
  return message ? (
    <p className="direct-notice" role="alert">
      {message}
    </p>
  ) : null;
}
export function DirectCollection() {
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getDirectProducts>
  > | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    getDirectProducts(c.signal)
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => c.abort();
  }, []);
  return (
    <Chrome>
      <Seo
        title="Handcrafted finds"
        description="Discover independent products sold directly through DealMosaic."
        path="/handcrafted"
        index={!!data?.products.length}
      />
      <div className="container direct-page">
        <p className="eyebrow">Independent products · owner-operated sales</p>
        <h1 className="h1">Handcrafted finds</h1>
        <p className="lead">
          Explore the details. Choose your fit. Check delivery before paying.
        </p>
        <ErrorBox message={error} />
        {!data && !error && <p role="status">Loading the collection…</p>}
        {data && !data.products.length && (
          <div className="card card-lg">
            <h2 className="h3">No direct-sale products available right now</h2>
            <p>Your usual store deals are still available.</p>
            <Link to="/deals" className="btn btn-primary">
              Explore store deals
            </Link>
          </div>
        )}
        <div className="direct-grid">
          {data?.products.map((p) => (
            <DirectCard
              key={p.id}
              product={p}
              seller={data.seller?.name ?? ""}
            />
          ))}
        </div>
      </div>
    </Chrome>
  );
}
export function DirectProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<{
    product: PublicDirectProduct;
    seller: Seller;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [variant, setVariant] = useState("");
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [quote, setQuote] = useState<DirectQuote | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [address, setAddress] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
  });
  useEffect(() => {
    setData(null);
    setQuote(null);
    const c = new AbortController();
    apiRequest<{ product: PublicDirectProduct; seller: Seller }>(
      `/api/direct/products/${id}`,
      { signal: c.signal },
    )
      .then((d) => {
        setData(d);
        setVariant(d.product.variants.find((v) => v.available > 0)?.id ?? "");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => c.abort();
  }, [id]);
  const p = data?.product;
  const v = p?.variants.find((v) => v.id === variant);
  async function check() {
    setBusy(true);
    setError("");
    setQuote(null);
    try {
      const r = await apiRequest<{
        quote: DirectQuote | null;
        message: string;
      }>("/api/direct/quote", {
        method: "POST",
        body: { productId: id, variantId: variant, pincode: pin, code },
      });
      setQuote(r.quote);
      if (!r.quote) setError(r.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function order() {
    if (!quote) return;
    setBusy(true);
    setError("");
    try {
      let token = sessionStorage.getItem(`dm-checkout-${quote.id}`);
      if (!token) {
        token = newOrderToken();
        sessionStorage.setItem(`dm-checkout-${quote.id}`, token);
      }
      const r = await apiRequest<{ order: DirectOrderView }>(
        "/api/direct/orders",
        {
          method: "POST",
          body: {
            quoteId: quote.id,
            accessToken: token,
            buyer: {
              ...address,
              pincode: pin,
              state: quote.rate.destinationState,
            },
            policiesAccepted: accepted,
          },
        },
      );
      sessionStorage.setItem(`dm-order-${r.order.id}`, token);
      navigate(`/direct-orders/${r.order.id}#access=${token}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Chrome>
      <Seo
        title={p?.title ?? "Product details"}
        description={
          p?.description.slice(0, 150) ?? "Product details and delivery."
        }
        path={`/buy/${id}`}
        index={false}
      />
      <div className="container direct-page">
        <Link to="/handcrafted" className="small">
          ← All handcrafted finds
        </Link>
        <ErrorBox message={error} />
        {!data && !error && <p role="status">Loading product…</p>}
        {p && data && (
          <>
            <div className="direct-product-layout">
              <div className="direct-gallery">
                {p.media.map((m) =>
                  m.kind === "image" ? (
                    <img
                      key={m.id}
                      src={`/api/direct/media/${m.id}`}
                      alt={m.alt}
                      width="1000"
                      height="1000"
                    />
                  ) : (
                    <figure key={m.id}>
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        aria-label={m.alt}
                        src={`/api/direct/media/${m.id}`}
                      />
                      <figcaption className="small">{m.alt}</figcaption>
                    </figure>
                  ),
                )}
              </div>
              <div className="stack">
                <span className="badge badge-lime">
                  Owner-operated sale · buy on DealMosaic
                </span>
                <h1 className="h1">{p.title}</h1>
                <p className="muted">
                  Sold by {data.seller.name} · dispatched from West Bengal
                </p>
                <div className="row wrap">
                  <strong className="direct-price">
                    {rupees(p.priceMinor)}
                  </strong>
                  {p.discount && (
                    <>
                      <span className="muted small">
                        {p.referenceType === "mrp" ? "MRP" : "Previous price"}{" "}
                        <del>{rupees(p.referenceMinor)}</del>
                      </span>
                      <span className="direct-saving">
                        Save {rupees(p.discount.savingMinor)}
                        {p.discount.percent > 0
                          ? ` (${p.discount.percent}%)`
                          : ""}
                      </span>
                    </>
                  )}
                </div>
                <p className="small muted">
                  Item price. Delivery is added after your PIN is checked. No
                  separate GST is collected by this unregistered seller.
                </p>
                <p className="direct-prewrap">{p.description}</p>
                <label className="field">
                  Choose size / option
                  <select
                    className="select"
                    value={variant}
                    onChange={(e) => {
                      setVariant(e.target.value);
                      setQuote(null);
                    }}
                  >
                    <option value="">Select an option</option>
                    {p.variants.map((v) => (
                      <option key={v.id} value={v.id} disabled={!v.available}>
                        {v.label} ·{" "}
                        {v.available
                          ? v.mode === "made"
                            ? `made in about ${v.leadDays} days`
                            : "ready stock"
                          : "unavailable"}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="direct-notice">
                  <strong>Lowest confirmed delivery charge first</strong>
                  <p>
                    We compare the services checked for this parcel. A slower
                    service can win if it costs less. This does not claim to
                    compare every carrier in India.
                  </p>
                </div>
                <div className="field-row">
                  <label className="field">
                    Delivery PIN
                    <input
                      className="input"
                      inputMode="numeric"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value.replace(/\D/g, ""));
                        setQuote(null);
                      }}
                      autoComplete="postal-code"
                    />
                  </label>
                  <label className="field">
                    Coupon code (optional)
                    <input
                      className="input"
                      maxLength={32}
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.toUpperCase());
                        setQuote(null);
                      }}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || !v || !v.available || pin.length !== 6}
                  onClick={check}
                >
                  {busy ? "Checking…" : "Check delivery & total"}
                </button>
                <p className="small muted">
                  One product, one option per order. Packed dimensions determine
                  the shipping charge.
                </p>
              </div>
            </div>
            <div className="direct-grid direct-details">
              {[
                ["Materials", p.materials],
                ["Measurements & fit", p.measurements],
                ["Care", p.care],
              ].map(([title, body]) => (
                <section className="card card-lg" key={title}>
                  <h2 className="h3">{title}</h2>
                  <p className="direct-prewrap">{body}</p>
                </section>
              ))}
            </div>
            {quote && (
              <form
                className="card card-lg stack direct-checkout"
                onSubmit={(e) => {
                  e.preventDefault();
                  void order();
                }}
              >
                <p className="eyebrow">Your checkout</p>
                <h2 className="h2">Delivery & payment</h2>
                <div className="direct-notice">
                  <strong>
                    {quote.rate.provider} · {quote.rate.service}
                  </strong>
                  <p>
                    Lowest charge among {quote.compared} confirmed{" "}
                    {quote.compared === 1 ? "service" : "services"}. Estimated{" "}
                    {quote.deliveryDays} days including preparation and pickup
                    wait—not a delivery guarantee.
                  </p>
                  <p className="small">
                    Quote valid until{" "}
                    {new Date(quote.expiresAt).toLocaleTimeString("en-IN")}. The
                    parcel is booked by the seller after payment verification.
                  </p>
                </div>
                <Totals totals={quote.totals} />
                <div className="direct-form-grid">
                  {(["name", "email", "phone", "address", "city"] as const).map(
                    (key) => (
                      <label
                        className={`field ${key === "address" ? "direct-wide" : ""}`}
                        key={key}
                      >
                        {
                          {
                            name: "Full name",
                            email: "Email address",
                            phone: "Mobile number",
                            address: "House, street and area",
                            city: "City / town",
                          }[key]
                        }
                        <input
                          className="input"
                          required
                          maxLength={key === "address" ? 1000 : 200}
                          type={key === "email" ? "email" : "text"}
                          inputMode={key === "phone" ? "tel" : undefined}
                          autoComplete={
                            key === "name"
                              ? "name"
                              : key === "address"
                                ? "street-address"
                                : key === "phone"
                                  ? "tel"
                                  : key === "city"
                                    ? "address-level2"
                                    : "email"
                          }
                          value={address[key]}
                          onChange={(e) =>
                            setAddress({ ...address, [key]: e.target.value })
                          }
                        />
                      </label>
                    ),
                  )}
                </div>
                <p>
                  {pin} · {quote.rate.destinationState} · India
                </p>
                <label className="row">
                  <input
                    type="checkbox"
                    checked={accepted}
                    required
                    onChange={(e) => setAccepted(e.target.checked)}
                  />
                  <span>
                    I have checked the seller's delivery and return policies
                    below.
                  </span>
                </label>
                <button
                  className="btn btn-primary"
                  disabled={busy || !accepted}
                >
                  {busy
                    ? "Creating order…"
                    : `Place order · ${rupees(quote.totals.totalMinor)}`}
                </button>
                <p className="small muted">
                  Pay by UPI after your order is created. A bank-credit check is
                  required before payment is confirmed. No account required.
                </p>
              </form>
            )}
            <section className="card card-lg stack direct-details">
              <h2 className="h3">Seller, delivery & returns</h2>
              <p>
                <strong>{data.seller.name}</strong>
                <br />
                {data.seller.address}
              </p>
              <p>
                Customer care: {data.seller.email} · {data.seller.phone}
                <br />
                Grievance contact: {data.seller.grievanceName}
              </p>
              <h3 className="h3">Delivery</h3>
              <p className="direct-prewrap">{data.seller.shippingPolicy}</p>
              <h3 className="h3">Returns</h3>
              <p className="direct-prewrap">{data.seller.returnsPolicy}</p>
            </section>
          </>
        )}
      </div>
    </Chrome>
  );
}
export function Totals({
  totals: t,
}: {
  totals: {
    itemMinor: number;
    discountMinor: number;
    shippingMinor: number;
    totalMinor: number;
  };
}) {
  return (
    <dl className="direct-totals">
      <div>
        <dt>Item before coupon</dt>
        <dd>{rupees(t.itemMinor + t.discountMinor)}</dd>
      </div>
      {t.discountMinor > 0 && (
        <div>
          <dt>Coupon saving</dt>
          <dd>−{rupees(t.discountMinor)}</dd>
        </div>
      )}
      <div>
        <dt>Delivery · all quoted charges</dt>
        <dd>{rupees(t.shippingMinor)}</dd>
      </div>
      <div>
        <dt>Total payable</dt>
        <dd>{rupees(t.totalMinor)}</dd>
      </div>
    </dl>
  );
}
export function DirectOrderPage() {
  const { id } = useParams();
  const [o, setOrder] = useState<DirectOrderView | null>(null);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [token] = useState(() => {
    const fromHash = new URLSearchParams(window.location.hash.slice(1)).get(
      "access",
    );
    const t = fromHash ?? sessionStorage.getItem(`dm-order-${id}`) ?? "";
    if (/^[a-f0-9]{64}$/.test(t)) sessionStorage.setItem(`dm-order-${id}`, t);
    return t;
  });
  async function load() {
    setBusy(true);
    setError("");
    try {
      const d = await apiRequest<{ order: DirectOrderView }>(
        `/api/direct/orders/${id}`,
        { headers: { "x-order-token": token } },
      );
      setOrder(d.order);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, [id, token]);
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const d = await apiRequest<{ order: DirectOrderView }>(
        `/api/direct/orders/${id}/reference`,
        {
          method: "POST",
          headers: { "x-order-token": token },
          body: { reference },
        },
      );
      setOrder(d.order);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const canPay =
    o &&
    o.status === "awaiting_payment" &&
    Date.parse(o.reservationUntil) > Date.now();
  const upi = o
    ? `upi://pay?${new URLSearchParams({ pa: o.seller.upiId, pn: o.seller.payeeName, am: (o.totals.totalMinor / 100).toFixed(2), cu: "INR", tn: `DM ${o.id}`, tr: o.id })}`
    : "";
  return (
    <Chrome>
      <Seo
        title="Your direct order"
        description="Your order, payment and delivery status."
        path={`/direct-orders/${id}`}
        index={false}
      />
      <div className="container direct-page direct-order-page">
        <p className="eyebrow">DealMosaic · direct order</p>
        <h1 className="h1">Your order</h1>
        <ErrorBox message={error} />
        {!o && !error && <p role="status">Loading your order…</p>}
        {o && (
          <div className="stack">
            <div className="card card-lg stack">
              <span className="badge badge-lime">{orderLabel(o.status)}</span>
              <h2 className="h2">{o.title}</h2>
              <p>{o.option}</p>
              <p className="small muted direct-break">Order {o.id}</p>
              <Totals totals={o.totals} />
              <p>
                Delivery:{" "}
                <strong>
                  {o.rate.provider} · {o.rate.service}
                </strong>
                <br />
                Estimated {o.deliveryDays} days from order acceptance, including
                preparation. {o.tracking && `Tracking reference: ${o.tracking}`}
              </p>
              <p className="small muted">
                A selected service is not a booking confirmation. Tracking
                appears when the seller dispatches.
              </p>
            </div>
            {canPay && (
              <section className="card card-lg stack">
                <h2 className="h3">Pay by UPI</h2>
                <p>
                  Pay exactly <strong>{rupees(o.totals.totalMinor)}</strong> to{" "}
                  <strong>{o.seller.payeeName}</strong>.
                </p>
                <p className="direct-break">UPI ID: {o.seller.upiId}</p>
                <a className="btn btn-primary" href={upi}>
                  Open your UPI app
                </a>
                <p className="small muted">
                  Check the recipient name in your bank app. If this button
                  cannot open an app, use the UPI ID above. Never share your UPI
                  PIN.
                </p>
                <p className="small">
                  Payment window ends{" "}
                  {new Date(o.reservationUntil).toLocaleString("en-IN")}. Do not
                  pay after that time; contact the seller instead.
                </p>
              </section>
            )}
            {(canPay || o.status === "payment_review") && (
              <form
                className="card card-lg stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                <h2 className="h3">Already paid?</h2>
                <label className="field">
                  UPI transaction reference
                  <input
                    className="input"
                    required
                    minLength={10}
                    maxLength={35}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </label>
                <button className="btn btn-primary" disabled={busy}>
                  Submit payment reference
                </button>
                <p className="small muted">
                  This is a payment claim, not confirmation. The seller checks
                  the actual bank credit. Do not pay again while verification is
                  pending.
                </p>
                {o.customerReference && (
                  <p className="small">
                    Submitted reference: {o.customerReference}
                  </p>
                )}
              </form>
            )}
            <div className="card card-lg stack">
              <h2 className="h3">Delivery address</h2>
              <p className="direct-prewrap">
                {o.buyer.name}
                <br />
                {o.buyer.address}
                <br />
                {o.buyer.city}, {o.buyer.state} {o.buyer.pincode}
              </p>
              <p>
                Seller: {o.seller.sellerName}
                <br />
                Support: {o.seller.supportEmail} · {o.seller.supportPhone}
              </p>
              <details>
                <summary>Purchase policies</summary>
                <p className="direct-prewrap">{o.seller.shippingPolicy}</p>
                <p className="direct-prewrap">{o.seller.returnsPolicy}</p>
              </details>
              <p className="small">
                Save your private order link to return to this page. Anyone with
                this link can view this order—do not share it publicly.
              </p>
              <div className="row wrap">
                <button
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={load}
                >
                  Refresh status
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `${location.origin}/direct-orders/${id}#access=${token}`,
                      );
                      setCopied(true);
                    } catch {
                      setError(
                        "Copy the order link from your browser address bar.",
                      );
                    }
                  }}
                >
                  {copied ? "Private link copied" : "Copy private order link"}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => window.print()}
                >
                  Print / save order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Chrome>
  );
}
