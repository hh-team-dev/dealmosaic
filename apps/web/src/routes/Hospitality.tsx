import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Chrome } from "../components/PublicChrome";
import { Seo } from "../lib/seo";
import { usePwa } from "../lib/pwa";
import { useToast } from "../components/Toast";
import { listCoupons, type CouponView } from "../lib/coupons-api";
import { ShopLink } from "../components/ShopLink";
import {
  CITIES,
  FOOD_BRANDS,
  LOCAL_DINING_TYPES,
  localDiningSearch,
  brandCitySearch,
  cityById,
  indiaToday,
  validateStay,
  bookingSearch,
  hotelDirectory,
  hospitalityCoupon,
  moneyInput,
  diningTotal,
  rupees,
  type City,
  type FoodBrand,
  type StayPlan,
} from "../lib/hospitality";
import "../design/hospitality.css";

function Outside({
  href,
  children,
  className = "hospitality-link",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const { disconnected } = usePwa();
  return disconnected ? (
    <span className={className} aria-disabled="true">
      Reconnect to continue
    </span>
  ) : (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${typeof children === "string" ? children : "Visit provider"} (opens new tab)`}
    >
      {children}
      <span aria-hidden="true"> ↗</span>
    </a>
  );
}
function Art({ dining = false }: { dining?: boolean }) {
  return (
    <svg
      className="hospitality-art"
      viewBox="0 0 440 340"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="230" cy="160" r="138" fill="var(--hospitality-wash)" />
      {dining ? (
        <>
          <ellipse
            cx="235"
            cy="222"
            rx="164"
            ry="48"
            fill="var(--hospitality-paper)"
            stroke="var(--hospitality-accent)"
            strokeWidth="2"
          />
          <ellipse
            cx="235"
            cy="210"
            rx="88"
            ry="36"
            fill="none"
            stroke="var(--hospitality-accent)"
            strokeWidth="2"
          />
          <ellipse
            cx="235"
            cy="207"
            rx="65"
            ry="25"
            fill="none"
            stroke="var(--hospitality-accent)"
          />
          <path
            d="M190 185q45-78 90 0q-45 22-90 0M220 120q-20-25 0-40m25 40q20-25 0-40M97 145v110m-10-110v35q10 20 20 0v-35m237 0v110m0-110q35 38 0 55"
            fill="none"
            stroke="var(--hospitality-accent)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M298 120h38l-8 38h-22zM317 158v32m-13 0h26"
            fill="var(--hospitality-paper)"
            stroke="var(--hospitality-accent)"
            strokeWidth="2"
          />
        </>
      ) : (
        <>
          <path
            d="M116 288V128a104 104 0 01208 0v160z"
            fill="var(--hospitality-paper)"
            stroke="var(--hospitality-accent)"
            strokeWidth="2"
          />
          <path
            d="M137 288V130a83 83 0 01166 0v158M220 47v241M137 143h166"
            fill="none"
            stroke="var(--hospitality-accent)"
            strokeWidth="2"
          />
          <circle cx="270" cy="98" r="22" fill="var(--hospitality-accent)" />
          <path
            d="M152 257v-69h137v69m-137-43h137m-124-25v25m108-25v25M103 290h236M62 288v-70m0 26q-32-15-22-48q25 3 22 48m0-12q30-12 29-43q-30 4-29 43"
            fill="none"
            stroke="var(--hospitality-accent)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M173 198h35v13h-35zm61 0h35v13h-35z"
            fill="var(--hospitality-wash)"
          />
        </>
      )}
      <path
        d="M355 62v24m-12-12h24M69 112v16m-8-8h16"
        stroke="var(--hospitality-accent)"
        strokeWidth="2"
      />
    </svg>
  );
}
function CityPicker({
  city,
  onChange,
}: {
  city: City;
  onChange: (id: string) => void;
}) {
  return (
    <label className="hospitality-city">
      Your city region
      <select
        aria-label="City region"
        value={city.id}
        onChange={(e) => onChange(e.target.value)}
      >
        {CITIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
function Offers({
  kind,
  brand,
}: {
  kind: "stays" | "dining";
  brand?: FoodBrand;
}) {
  const { disconnected } = usePwa();
  const [rows, setRows] = useState<CouponView[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    let controller: AbortController | null = null;
    let stopped = false;
    const run = () => {
      if (
        stopped ||
        document.hidden ||
        disconnected ||
        (kind === "dining" && !brand)
      )
        return;
      controller?.abort();
      controller = new AbortController();
      const current = controller;
      setError(false);
      setRows(null);
      listCoupons({
        ...(kind === "stays"
          ? { group: "travel" }
          : {
              q: brand!.id
                .split("-")[0]!
                .replace("dominos", "domino")
                .replace("mcdonalds", "mcdonald"),
            }),
        limit: 200,
        signal: current.signal,
      })
        .then((d) => {
          if (!current.signal.aborted) {
            if (
              !Array.isArray(d.coupons) ||
              d.coupons.some(
                (c) =>
                  !c ||
                  typeof c.id !== "string" ||
                  typeof c.title !== "string" ||
                  typeof c.platformName !== "string" ||
                  typeof c.platformSlug !== "string" ||
                  (c.code != null && typeof c.code !== "string") ||
                  (c.terms != null && typeof c.terms !== "string"),
              )
            )
              throw new Error("Invalid offer feed");
            setRows(d.coupons);
            setClock(Date.now());
          }
        })
        .catch(() => {
          if (!current.signal.aborted) {
            setError(true);
            setRows([]);
          }
        });
    };
    run();
    const interval = setInterval(run, 300000);
    const visible = () => {
      if (!document.hidden) run();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      stopped = true;
      controller?.abort();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [kind, brand?.id, disconnected, attempt]);
  useEffect(() => {
    if (!rows) return;
    const expiry = rows
      .map((c) => Date.parse(c.expiresAt || ""))
      .filter((n) => n > clock)
      .sort((a, b) => a - b)[0];
    if (!expiry) return;
    const timer = setTimeout(
      () => setClock(Date.now()),
      Math.min(expiry - clock + 30, 2147483647),
    );
    return () => clearTimeout(timer);
  }, [rows, clock]);
  const eligible =
    rows?.filter((c) => hospitalityCoupon(c, kind, brand, clock)).slice(0, 6) ||
    [];
  return (
    <section
      className="hospitality-section"
      aria-labelledby="hospitality-offers-title"
    >
      <div className="hospitality-section-head">
        <div>
          <span className="hospitality-eyebrow">The offer desk</span>
          <h2 id="hospitality-offers-title">
            A little checking. A better decision.
          </h2>
        </div>
      </div>
      <p className="hospitality-note">
        Provider-listed promotions, not confirmed city or outlet discounts.
        Check dates, eligible rooms or items, payment rules and the final total
        at the provider. Cashback is not money off today.
      </p>
      {disconnected ? (
        <p role="status" className="hospitality-notice">
          Reconnect to check current offers. We never present old codes as live
          savings.
        </p>
      ) : kind === "dining" && !brand ? (
        <p className="hospitality-notice">
          Choose a brand in the directory to check its matching feed codes.
          Official menus and offer pages are available below.
        </p>
      ) : error ? (
        <div className="hospitality-notice" role="status">
          The offer feed could not be reached. That does not mean the provider
          has no offers.{" "}
          <button
            className="btn btn-quiet"
            onClick={() => setAttempt((a) => a + 1)}
          >
            Retry offer feed
          </button>
        </div>
      ) : rows === null ? (
        <p role="status">Checking the offer feed…</p>
      ) : eligible.length === 0 ? (
        <p className="hospitality-notice">
          No matching current codes to display from the feed checked. Explore
          the official sites for their current menus, rates and offers.
        </p>
      ) : (
        <div className="hospitality-offers">
          {eligible.map((c) => (
            <article className="hospitality-offer" key={c.id}>
              <span className="hospitality-eyebrow">
                {c.platformName} · provider listed
              </span>
              <h3>{c.title}</h3>
              <p className="small">
                Published expiry:{" "}
                {new Date(c.expiresAt!).toLocaleDateString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                . Not checkout-tested by DealMosaic.
              </p>
              {c.code && (
                <p className="hospitality-code">
                  Code <strong>{c.code}</strong>
                </p>
              )}
              <details>
                <summary>Read before you use it</summary>
                <p>
                  {c.terms ||
                    "Full eligibility and exclusions are not supplied in this feed. Check the provider’s terms before committing."}
                </p>
                <p>
                  City, outlet, room, date and payment eligibility are not
                  confirmed here. Provider headlines may combine instant
                  discounts with conditional cashback.
                </p>
              </details>
              <ShopLink
                coupon={c}
                source={`hospitality-${kind}`}
                label="Check offer with provider"
              />
            </article>
          ))}
        </div>
      )}
      <p className="hospitality-note">
        Offer links may earn a commission on qualifying transactions. Official
        directory links are not affiliate links. Commission does not decide
        display order. <Link to="/disclosure">How we earn</Link>
      </p>
    </section>
  );
}
function StaySearch({ city }: { city: City }) {
  const { disconnected } = usePwa();
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [adults, setAdults] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [ages, setAges] = useState<string[]>([]);
  const [area, setArea] = useState("New Delhi");
  const [error, setError] = useState("");
  const [ready, setReady] = useState<StayPlan | null>(null);
  const results = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setReady(null);
    setError("");
  }, [city.id, checkin, checkout, adults, rooms, area, ages]);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const plan = {
      city: city.id,
      area,
      checkin,
      checkout,
      adults,
      rooms,
      ages,
    };
    const message = validateStay(plan);
    setError(message || "");
    if (!message) {
      setReady(plan);
      requestAnimationFrame(() => results.current?.focus());
    }
  }
  return (
    <section
      className="hospitality-planner"
      id="stay-planner"
      aria-labelledby="stay-planner-title"
    >
      <div>
        <span className="hospitality-eyebrow">Your next check-in</span>
        <h2 id="stay-planner-title">Start with your plans.</h2>
        <p>
          No guessed room rates. Choose your stay, then check current
          availability with the provider.
        </p>
      </div>
      <form onSubmit={submit} noValidate className="hospitality-form">
        {city.id === "delhi-ncr" && (
          <label>
            NCR destination
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              {["New Delhi", "Gurugram", "Noida"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          Check-in
          <input
            type="date"
            min={indiaToday()}
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
            required
          />
        </label>
        <label>
          Check-out
          <input
            type="date"
            min={checkin || indiaToday()}
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            required
          />
        </label>
        <label>
          Adults
          <select
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value))}
          >
            {Array.from({ length: 8 }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label>
          Rooms
          <select
            value={rooms}
            onChange={(e) => setRooms(Number(e.target.value))}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Children
          <select
            value={ages.length}
            onChange={(e) =>
              setAges((old) =>
                Array.from(
                  { length: Number(e.target.value) },
                  (_, i) => old[i] ?? "",
                ),
              )
            }
          >
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        {ages.map((age, i) => (
          <label key={i}>
            Child {i + 1} age
            <select
              value={age}
              onChange={(e) =>
                setAges((old) =>
                  old.map((a, n) => (n === i ? e.target.value : a)),
                )
              }
            >
              <option value="">Choose age</option>
              {Array.from({ length: 18 }, (_, n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        ))}
        <button
          className="hospitality-primary"
          type="submit"
          disabled={disconnected}
        >
          Prepare my hotel search <span aria-hidden="true">→</span>
        </button>
      </form>
      {error && (
        <p role="alert" className="hospitality-notice">
          {error}
        </p>
      )}
      {ready && !validateStay(ready) && (
        <div ref={results} tabIndex={-1} className="hospitality-search-ready">
          <h3>Your {city.name} search is ready.</h3>
          <p>
            {ready.checkin} to {ready.checkout} · {adults} adult
            {adults === 1 ? "" : "s"} · {rooms} room{rooms === 1 ? "" : "s"}
            {ages.length ? ` · ${ages.length} children` : ""}
          </p>
          <Outside href={bookingSearch(ready)} className="hospitality-primary">
            Search these dates on Booking.com
          </Outside>
          <p className="small">
            Opens the provider with these search details. Reconfirm dates,
            guests, room allocation, price and cancellation terms there. This is
            a search—not a reservation.
          </p>
        </div>
      )}
      <p className="hospitality-note">
        Dates and guest details stay in this page until you choose the provider
        link; they are not saved to your DealMosaic account. City guide links do
        not carry these dates.
      </p>
    </section>
  );
}
function QuoteTool({ dining }: { dining: boolean }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [show, setShow] = useState(false);
  const field = (key: string, label: string) => (
    <label key={key}>
      {label}
      <input
        inputMode="decimal"
        value={values[key] || ""}
        onChange={(e) => {
          setValues((v) => ({ ...v, [key]: e.target.value }));
          setShow(false);
        }}
        maxLength={12}
      />
    </label>
  );
  const a = moneyInput(values.a || ""),
    b = moneyInput(values.b || ""),
    af = moneyInput(values.af || "", true),
    bf = moneyInput(values.bf || "", true);
  const stayValid =
    a !== null && a > 0 && b !== null && b > 0 && af !== null && bf !== null;
  const at = (a ?? 0) + (af ?? 0),
    bt = (b ?? 0) + (bf ?? 0);
  const calc = diningTotal({
    eligible: values.eligible || "",
    excluded: values.excluded || "",
    fees: values.fees || "",
    percent: values.percent || "",
    cap: values.cap || "",
    minimum: values.minimum || "",
  });
  return (
    <section
      className="hospitality-calculator hospitality-section"
      aria-labelledby="calculator-title"
    >
      <div>
        <span className="hospitality-eyebrow">
          Know the number that matters
        </span>
        <h2 id="calculator-title">
          {dining
            ? "A big discount. Or a better bill?"
            : "The room rate is only the beginning."}
        </h2>
        <p>
          {dining
            ? "Enter an offer you found. See how its cap and exclusions affect your bill."
            : "Compare two quotes you found for the same dates, guests, room and cancellation terms."}
        </p>
        <p className="hospitality-note">
          Your inputs only. This calculator does not fetch prices, check
          eligibility or reserve anything. Values are not saved or sent to a
          server. Amounts in INR; maximum ₹10 lakh per field.
        </p>
      </div>
      <form
        className="hospitality-form"
        onSubmit={(e) => {
          e.preventDefault();
          setShow(true);
        }}
        noValidate
      >
        {dining ? (
          <>
            {field("eligible", "Eligible food amount (₹)")}
            {field("percent", "Discount (%)")}
            {field("cap", "Discount cap (₹, blank = no cap)")}
            {field("minimum", "Minimum eligible spend (₹, optional)")}
            {field("excluded", "Excluded items (₹, optional)")}
            {field("fees", "Final taxes & fees (₹, optional)")}
          </>
        ) : (
          <>
            {field("a", "Quote A: entire stay room cost (₹)")}
            {field("af", "Quote A: extra mandatory charges (₹)")}
            {field("b", "Quote B: entire stay room cost (₹)")}
            {field("bf", "Quote B: extra mandatory charges (₹)")}
          </>
        )}
        <button className="hospitality-primary">
          {dining ? "Calculate my bill" : "Compare entered totals"}
        </button>
      </form>
      {show && (
        <div role="status" className="hospitality-calculation-result">
          {dining ? (
            calc ? (
              <>
                <strong>Estimated payable: {rupees(calc.total)}</strong>
                <p>
                  Calculated discount: {rupees(calc.saving)}.
                  {calc.belowMinimum
                    ? " The entered minimum spend is not met."
                    : ""}
                </p>
              </>
            ) : (
              <p>
                Enter a positive eligible amount, a discount from 0–100%, and
                valid non-negative rupee amounts (up to two decimals).
              </p>
            )
          ) : stayValid ? (
            <>
              <strong>
                Quote A: {rupees(at)} · Quote B: {rupees(bt)}
              </strong>
              <p>
                {at === bt
                  ? "Your entered totals are equal."
                  : `Quote ${at < bt ? "A" : "B"} is ${rupees(Math.abs(at - bt))} lower on the amounts entered.`}
              </p>
            </>
          ) : (
            <p>
              Enter positive room costs and valid non-negative charges (up to
              two decimals).
            </p>
          )}
        </div>
      )}
      <p className="hospitality-note">
        {dining
          ? "Taxes are not calculated. Enter the provider’s final taxes/fees after discounts; blank extras are treated as zero. Conditional cashback and rewards are excluded."
          : "Blank extras are treated as zero, not confirmed absent. Check every mandatory charge, room inclusion and refund rule before choosing."}
      </p>
    </section>
  );
}
function LocalDining({ city }: { city: City }) {
  const [detail, setDetail] = useState("");
  return (
    <section
      className="hospitality-section hospitality-local"
      id="local-dining"
      aria-labelledby="local-dining-title"
    >
      <div className="hospitality-section-head">
        <div>
          <span className="hospitality-eyebrow">
            Beyond the familiar chains
          </span>
          <h2 id="local-dining-title">
            Find your kind of table in {city.name}.
          </h2>
        </div>
        <a className="hospitality-secondary" href="#food-directory">
          Browse restaurant & fast-food chains ↓
        </a>
      </div>
      <p>
        Neighbourhood restaurants, a café around the corner, or a quick bite on
        the way. Explore map listings for your chosen destination—not just the
        brands in our directory.
      </p>
      <label>
        Refine these map searches (optional)
        <input
          type="search"
          maxLength={100}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Restaurant name, cuisine or neighbourhood"
        />
      </label>
      {detail && (
        <button className="hospitality-secondary" onClick={() => setDetail("")}>
          Clear local search
        </button>
      )}
      <div className="hospitality-local-grid">
        {LOCAL_DINING_TYPES.map((t) => (
          <article key={t.id}>
            <span className="hospitality-eyebrow">{city.name}</span>
            <h3>{t.label}</h3>
            <p>
              {t.id === "restaurants"
                ? "Discover neighbourhood dining and places beyond the chain directory."
                : t.id === "vegetarian"
                  ? "Explore vegetarian dining options; confirm the menu with the restaurant."
                  : t.id === "cafes"
                    ? "Find a coffee stop, bakery or somewhere to take a little longer."
                    : "Search beyond the listed chains for convenient bites and familiar favourites."}
            </p>
            <Outside
              href={localDiningSearch(city, t.id, detail)}
            >{`Search ${t.label.toLowerCase()}`}</Outside>
          </article>
        ))}
      </div>
      <p className="hospitality-note">
        Opens Google Maps in a new tab or its app. Map searches may include
        independent restaurants and chains; they are not DealMosaic-verified
        outlet lists or offers. Check the exact address, current hours, menu,
        service and any booking conditions with the restaurant. No location
        access is requested here. Your refinement is sent to Google Maps only
        when you open a search; it is not saved to your account or included in
        Copy city link.
      </p>
    </section>
  );
}
function Hospitality({ dining = false }: { dining?: boolean }) {
  const [params, setParams] = useSearchParams();
  const city = cityById(params.get("city"));
  const toast = useToast();
  const { disconnected } = usePwa();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [mode, setMode] = useState("dine-in");
  const brand = FOOD_BRANDS.find((b) => b.id === params.get("brand"));
  const changeCity = (id: string) => {
    // Read the current URL so two quick selections cannot overwrite a pending React render.
    const next = new URLSearchParams(location.search);
    next.set("city", id);
    setParams(next);
  };
  const changeBrand = (id: string) => {
    // Read the current URL so two quick selections cannot overwrite a pending React render.
    const next = new URLSearchParams(location.search);
    if (id) next.set("brand", id);
    else next.delete("brand");
    setParams(next, { replace: true });
  };
  const brands = FOOD_BRANDS.filter(
    (b) =>
      (!brand || b.id === brand.id) &&
      (kind === "all" || b.kind === kind) &&
      `${b.name} ${b.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  async function share() {
    const url = new URL(dining ? "/dining" : "/stays", location.origin);
    url.searchParams.set("city", city.id);
    if (dining && brand) url.searchParams.set("brand", brand.id);
    try {
      await navigator.clipboard.writeText(url.href);
      toast.push(
        "City link copied. Dates and calculator values are not included.",
        "info",
      );
    } catch {
      toast.push(
        "Copy is unavailable. Use your browser’s Share menu; only city and brand selections are in the address.",
        "info",
      );
    }
  }
  return (
    <>
      <Seo
        title={
          dining
            ? "Restaurants, food outlets & offer checks"
            : "Hotels & stays: plan your search, check the full cost"
        }
        description={
          dining
            ? "Explore official restaurant and food-chain sites, check provider-listed codes and calculate your eligible bill across our selected Indian destinations."
            : "Plan hotel searches across our selected Indian destinations, explore provider-listed promotions and compare the full cost of quotes you enter. Booking stays with the provider."
        }
        path={dining ? "/dining" : "/stays"}
      />
      <Chrome>
        <div
          className={`hospitality ${dining ? "hospitality-dining" : "hospitality-stays"}`}
        >
          <div className="hospitality-container">
            <header className="hospitality-hero">
              <div className="hospitality-hero-copy">
                <span className="hospitality-eyebrow">
                  DealMosaic / {dining ? "Dining & food" : "Hotels & stays"}
                </span>
                <h1>
                  {dining ? (
                    <>
                      Big cravings.
                      <br />
                      <em>Smarter spending.</em>
                    </>
                  ) : (
                    <>
                      Make the stay
                      <br />
                      <em>worth the trip.</em>
                    </>
                  )}
                </h1>
                <p className="hospitality-lede">
                  {dining
                    ? "From a favourite quick bite to a table worth making time for. Find your next stop. Check the offer. Know the bill."
                    : "A city escape. A work trip. A little room to unwind. Explore hotel options, check the conditions, and put the full cost in focus."}
                </p>
                <div className="hospitality-hero-actions">
                  <a
                    className="hospitality-primary"
                    href={dining ? "#local-dining" : "#stay-planner"}
                  >
                    {dining ? "Find my next bite" : "Plan my stay"}{" "}
                    <span aria-hidden="true">→</span>
                  </a>
                  <a
                    className="hospitality-secondary"
                    href="#hospitality-offers-title"
                  >
                    Check listed offers
                  </a>
                </div>
                <p className="hospitality-note">
                  {dining
                    ? "Local dining discovery and official brand destinations. Confirm outlet availability and offers with the provider."
                    : "Search and offer discovery, not live room-price comparison. Book and pay with the provider."}
                </p>
              </div>
              <div className="hospitality-hero-art">
                <Art dining={dining} />
                <span className="hospitality-art-caption">
                  {dining
                    ? "A little more taste. A little more thought."
                    : "Your next chapter, thoughtfully chosen."}
                </span>
              </div>
            </header>
            <div className="hospitality-city-band">
              <CityPicker city={city} onChange={changeCity} />
              <div>
                <strong>{city.name}, on your terms.</strong>
                <p>
                  {dining
                    ? "Select this city or your exact address again on the provider’s site."
                    : city.note}
                </p>
              </div>
              <button className="hospitality-secondary" onClick={share}>
                Copy city link
              </button>
            </div>
            <p className="hospitality-coverage">
              {CITIES.length} selectable destinations. Delhi NCR overlaps the
              separate Gurugram and Noida entries. City selection is a planning
              preference—not confirmation of every outlet, room or discount.
            </p>
            <details className="hospitality-destinations">
              <summary>View all {CITIES.length} destinations</summary>
              <p>{CITIES.map((c) => c.name).join(" · ")}</p>
            </details>
            <aside className="hospitality-pet-callout" aria-labelledby="pet-entry-title"><div><span className="hospitality-eyebrow">Bring your companion</span><h2 id="pet-entry-title">A welcome worth checking.</h2><p>Pet-friendly places, with or without a deal. Read the source, check the restrictions and plan the full cost.</p></div><div><Link className="hospitality-primary" to={`/pet-friendly?city=${city.id}&type=${dining?'restaurant':'hotel'}`}>{dining?'Pet-friendly dining':'Pet-friendly stays'} in {city.name} →</Link><Link className="hospitality-secondary" to="/pet-friendly">View all destinations together →</Link></div></aside>
            {dining && <LocalDining key={city.id} city={city} />}
            {!dining && <StaySearch city={city} />}
            {dining && (
              <section
                className="hospitality-section"
                id="food-directory"
                aria-labelledby="food-title"
              >
                <div className="hospitality-section-head">
                  <div>
                    <span className="hospitality-eyebrow">
                      Find your flavour
                    </span>
                    <h2 id="food-title">Familiar favourites. A fresh plan.</h2>
                  </div>
                  <span className="hospitality-small-tag">
                    Official destinations
                  </span>
                </div>
                <div className="hospitality-filter-grid">
                  <label>
                    Find a brand or cuisine
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Pizza, momos, Chinese…"
                    />
                  </label>
                  <label>
                    Experience
                    <select
                      value={kind}
                      onChange={(e) => setKind(e.target.value)}
                    >
                      <option value="all">Restaurants & quick bites</option>
                      <option>Restaurant</option>
                      <option>Quick bites</option>
                    </select>
                  </label>
                  <label>
                    Choose a brand
                    <select
                      value={brand?.id || ""}
                      onChange={(e) => changeBrand(e.target.value)}
                    >
                      <option value="">All brands</option>
                      {FOOD_BRANDS.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Your plan
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                    >
                      <option value="dine-in">Dine in</option>
                      <option value="delivery">Delivery</option>
                      <option value="takeaway">Takeaway</option>
                    </select>
                  </label>
                </div>
                <p className="hospitality-note">
                  {mode === "dine-in"
                    ? "Open the official locator or restaurant site. Check the outlet, table and offer conditions before you go."
                    : "Open the official ordering page where available; otherwise use the locator to check this service. Your exact address, outlet and fulfilment mode must be confirmed there."}{" "}
                  Names identify the brands; they do not imply a partnership, a
                  discount or availability in {city.name}.
                </p>
                <div className="hospitality-brand-grid">
                  {brands.map((b, i) => (
                    <article className="hospitality-brand-card" key={b.id}>
                      <div
                        className={`hospitality-brand-glyph glyph-${i % 3}`}
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 80 60" width="80" height="60">
                          <path
                            d={
                              b.category.includes("Pizza")
                                ? "M16 49L40 7l25 42zM24 47h32M34 28h1m9 10h1m0-18h1"
                                : b.kind === "Restaurant"
                                  ? "M16 39h48M22 36a18 18 0 0136 0M40 15v-5m-9 0h18M12 46h56"
                                  : "M16 24q24-26 48 0zM15 31h50M17 40h46l-6 10H23z"
                            }
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <span className="hospitality-eyebrow">
                        {b.kind} / {b.category}
                      </span>
                      <h3>{b.name}</h3>
                      <p>{b.note}</p>
                      <Outside
                        href={
                          mode === "dine-in" ? b.locator : b.order || b.locator
                        }
                      >
                        {mode === "dine-in"
                          ? "Explore official site"
                          : b.order
                            ? "Open official ordering"
                            : "Check outlet services"}
                      </Outside>
                      <Outside
                        className="hospitality-secondary"
                        href={brandCitySearch(city, b)}
                      >{`Find ${b.name} in ${city.name}`}</Outside>
                      <span className="hospitality-domain">
                        {
                          new URL(
                            mode === "dine-in"
                              ? b.locator
                              : b.order || b.locator,
                          ).hostname
                        }
                      </span>
                    </article>
                  ))}
                </div>
                {brands.length === 0 && (
                  <div className="hospitality-notice" role="status">
                    <p>
                      No brand matches these filters. This is not a statement
                      about local restaurant availability.
                    </p>
                    <button
                      className="btn btn-quiet"
                      onClick={() => {
                        setQuery("");
                        setKind("all");
                        changeBrand("");
                      }}
                    >
                      Reset brand filters
                    </button>
                  </div>
                )}
              </section>
            )}
            <Offers kind={dining ? "dining" : "stays"} brand={brand} />
            {!dining && (
              <section
                className="hospitality-section"
                aria-labelledby="provider-title"
              >
                <span className="hospitality-eyebrow">
                  Keep your options open
                </span>
                <h2 id="provider-title">
                  Your city. More than one starting point.
                </h2>
                <div className="hospitality-provider-grid">
                  <article>
                    <span className="hospitality-provider-number">01</span>
                    <h3>MakeMyTrip</h3>
                    <p>
                      Explore the{" "}
                      {city.id === "delhi-ncr" ? "Delhi" : city.name} hotel
                      guide, then choose your dates and guests there.
                    </p>
                    <Outside href={hotelDirectory(city)}>
                      Open city hotel guide
                    </Outside>
                  </article>
                  <article>
                    <span className="hospitality-provider-number">02</span>
                    <h3>Cleartrip Hotels</h3>
                    <p>
                      Choose your city and dates on Cleartrip. Check the total
                      and any payment-linked promotion.
                    </p>
                    <Outside href="https://www.cleartrip.com/hotels">
                      Explore Cleartrip Hotels
                    </Outside>
                  </article>
                  <article>
                    <span className="hospitality-provider-number">03</span>
                    <h3>ITC Hotels</h3>
                    <p>
                      Explore the hotel group’s official site. Select a property
                      and confirm stay inclusions.
                    </p>
                    <Outside href="https://www.itchotels.com/in/en">
                      Explore ITC Hotels
                    </Outside>
                  </article>
                </div>
              </section>
            )}
            <QuoteTool dining={dining} />
            <section className="hospitality-promise">
              <span className="hospitality-eyebrow">The DealMosaic way</span>
              <h2>A good decision should feel good afterwards.</h2>
              <div>
                <article>
                  <strong>Clear before you commit.</strong>
                  <p>
                    {dining
                      ? "Check the outlet, eligible items, minimum bill and payment method."
                      : "Match the room, guests, meals, taxes and cancellation deadline."}
                  </p>
                </article>
                <article>
                  <strong>No borrowed certainty.</strong>
                  <p>
                    A provider-listed offer is not a code we tested. Unknown
                    conditions stay visible.
                  </p>
                </article>
                <article>
                  <strong>You stay in control.</strong>
                  <p>
                    No forced account, no automatic booking, no payment details
                    collected here.
                  </p>
                </article>
              </div>
              <Link className="hospitality-secondary" to="/contact">
                Something does not match? Tell us
              </Link>
            </section>
            <details className="hospitality-method">
              <summary>How this experience works</summary>
              <p>
                DealMosaic brings together an editorial directory of official
                sites, selected current provider-feed promotions and calculators
                using your own inputs. There is no live hotel inventory or
                outlet reservation feed here. The directory is not sorted by
                commission and does not assert coverage of each brand in every
                selected city. Confirm the city or exact address with the
                provider.
              </p>
              <p>
                Directory sources were reviewed on 4 November 2026.
                City-specific map searches are discovery links, not a licensed
                restaurant database or a guarantee of matching results. Brand
                names belong to their owners. Artwork is original decorative
                illustration, not a photograph of a listed property or dish. No
                reviews or star ratings are invented.
              </p>
              <p>
                {disconnected
                  ? "You are disconnected. External shopping and current promotions are unavailable."
                  : "Bookings, orders, delivery, cancellation and refunds are handled by the provider you choose."}{" "}
                A new tab may open a provider’s app. Search details are sent
                only when you choose that provider; no automatic location
                permission is requested.
              </p>
            </details>
          </div>
        </div>
      </Chrome>
    </>
  );
}
export function Stays() {
  return <Hospitality />;
}
export function Dining() {
  return <Hospitality dining />;
}
