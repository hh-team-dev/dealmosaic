import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Chrome } from "../components/PublicChrome";
import { Seo } from "../lib/seo";
import { usePwa } from "../lib/pwa";
import { CITIES, cityById, indiaToday } from "../lib/hospitality";
import { sourceAge } from "../lib/pets";
import {
  COMPARISON_VENUES,
  COMPARISON_STORAGE_KEY,
  MAX_PERSONAL_QUOTES,
  venuesFor,
  planError,
  samePlan,
  quoteCost,
  quoteIssue,
  comparisonGroups,
  parseQuoteMoney,
  readPersonalQuotes,
  serializePersonalQuotes,
  validPersonalQuote,
  quoteCsv,
  type VenueKind,
  type QuotePlan,
  type PersonalQuote,
  type ComparisonVenue,
} from "../lib/hospitality-comparison";
import "../design/hospitality.css";
import "../design/hospitality-comparison.css";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n / 100);
const day = (s: string) =>
  new Date(s + "T00:00:00+05:30").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
const planLabel = (p: QuotePlan) =>
  p.kind === "hotel"
    ? `${day(p.arrival)}–${day(p.departure)} · ${p.adults} adults · ${p.rooms} room${p.rooms > 1 ? "s" : ""}${p.childAges.length ? ` · children aged ${p.childAges.join(", ")}` : ""}`
    : `${day(p.arrival)} · ${p.time} India time · ${p.adults} people · ${p.diningMode}`;
function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function SourceLink({ venue }: { venue: ComparisonVenue }) {
  const { disconnected } = usePwa();
  return disconnected ? (
    <span className="small">Reconnect to open the source.</span>
  ) : (
    <div className="hc-source-links">
      <a
        className="hospitality-link"
        href={venue.website}
        target="_blank"
        rel="noopener noreferrer"
      >
        View {venue.evidence === "official" ? "official" : "published"}{" "}
        information ↗<span className="sr-only"> (new tab)</span>
      </a>
      {venue.sourceUrl !== venue.website && (
        <a
          className="hospitality-link"
          href={venue.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Evidence source ↗<span className="sr-only"> (new tab)</span>
        </a>
      )}
      <span className="small">
        {venue.sourceMethod === "index"
          ? "Indexed excerpt reviewed; the page itself was not independently confirmed."
          : venue.sourceMethod === "directory"
            ? "Named in the publisher’s directory; individual venue operations were not checked."
            : "Published page information reviewed; not a venue inspection."}
      </span>
    </div>
  );
}
function QuoteEntry({
  venue,
  plan,
  onSave,
  onCancel,
  onDirty,
}: {
  venue: ComparisonVenue;
  plan: QuotePlan;
  onSave: (q: PersonalQuote) => Promise<boolean>;
  onCancel: () => void;
  onDirty: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancel, setCancel] = useState("unknown");
  const [eligibility, setEligibility] = useState("unknown");
  const title = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const hotel = plan.kind === "hotel";
  useEffect(() => {
    title.current?.focus();
  }, []);
  function fail(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const f = new FormData(e.currentTarget);
    const get = (n: string) => String(f.get(n) || "").trim();
    const fields = [
      "baseMinor",
      "extraFeesMinor",
      "onSiteMinor",
      "extrasMinor",
      "depositMinor",
      "cashbackMinor",
    ] as const;
    const amounts = Object.fromEntries(
      fields.map((k) => [k, parseQuoteMoney(get(k))]),
    ) as Record<(typeof fields)[number], number | null>;
    if (fields.some((k) => get(k) && amounts[k] === null))
      return fail(
        "Enter rupee amounts with at most two decimal places, without commas or symbols. Blank means unknown, not zero.",
      );
    if (amounts.baseMinor === null || amounts.baseMinor <= 0)
      return fail(
        "Enter the positive quoted amount for the whole stay or meal, not a per-night or per-person amount.",
      );
    const q: PersonalQuote = {
      id: crypto.randomUUID(),
      venueId: venue.id,
      provider: get("provider"),
      plan,
      item: get("item"),
      meal: hotel ? (get("meal") as PersonalQuote["meal"]) : "other",
      cancellation: cancel as PersonalQuote["cancellation"],
      cancelUntil: cancel === "free-until" ? get("cancelUntil") : "",
      payment: get("payment") as PersonalQuote["payment"],
      eligibility: eligibility as PersonalQuote["eligibility"],
      eligibilityDetails:
        eligibility === "conditional-confirmed"
          ? get("eligibilityDetails")
          : "",
      ...amounts,
      baseMinor: amounts.baseMinor,
      complete: f.get("complete") === "on",
      recordedAt: new Date().toISOString(),
      provenance: "personal",
    };
    if (
      q.complete &&
      [q.extraFeesMinor, q.onSiteMinor, q.extrasMinor].some((n) => n === null)
    )
      return fail(
        "To mark the total complete, enter every extra charge. Enter 0 only where no additional amount is due; otherwise leave the total unconfirmed.",
      );
    if (!validPersonalQuote(q))
      return fail(
        "Check the provider, exact room or meal description, eligibility details and terms. A free-cancellation deadline needs a valid India-local date and time no later than the arrival or visit date.",
      );
    const problem = planError(plan);
    if (problem) return fail(problem);
    setBusy(true);
    try {
      if (!(await onSave(q)))
        fail(
          "The quote was not saved. Check the storage message above; your entry is still here.",
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="hc-editor" aria-labelledby="hc-entry-title">
      <span className="hospitality-eyebrow">
        Your own quote · stored on this device
      </span>
      <h2 id="hc-entry-title" ref={title} tabIndex={-1}>
        Add a quote for {venue.name}
      </h2>
      <p>
        <strong>{planLabel(plan)}</strong>
        {plan.rooms > 1 && (
          <>
            <br />
            Room allocation: {plan.rooming}
          </>
        )}
      </p>
      <p>
        No booking is made. These are your entries, not prices fetched or
        checked by DealMosaic. Use the same room, beds and room allocation—or
        the same meal and quantities—across providers.
      </p>
      <form onSubmit={submit} onChange={onDirty} noValidate className="hc-form">
        <label>
          Who quoted this price?
          <input
            name="provider"
            maxLength={80}
            required
            autoComplete="off"
            placeholder="Provider or hotel name"
          />
        </label>
        <label className="hc-wide">
          {hotel
            ? "Exact room, beds and occupancy configuration"
            : "Exact meal, quantities and offer conditions"}
          <input
            name="item"
            maxLength={180}
            required
            autoComplete="off"
            placeholder={
              hotel
                ? "Use identical wording only for the same room configuration"
                : "Include the same items, sizes, quantities and eligibility"
            }
          />
        </label>
        <label>
          {hotel
            ? "Quoted accommodation amount"
            : "Quoted bill after instant discounts"}{" "}
          (₹)
          <input name="baseMinor" inputMode="decimal" required />
          <span className="small">
            {hotel
              ? "Whole stay, all rooms—not the nightly rate."
              : "Whole order or party—not per person. Confirm that the offer applies."}
          </span>
        </label>
        <label>
          Additional taxes and mandatory provider fees (₹)
          <input name="extraFeesMinor" inputMode="decimal" />
          <span className="small">
            Only amounts NOT already included above.
          </span>
        </label>
        <label>
          Additional mandatory charges at the venue (₹)
          <input name="onSiteMinor" inputMode="decimal" />
          <span className="small">Do not count the same amount twice.</span>
        </label>
        <label>
          Selected extras not included above (₹)
          <input name="extrasMinor" inputMode="decimal" />
          <span className="small">
            {hotel
              ? "For example, breakfast, extra beds, pet fees or parking."
              : "For example, packaging or delivery not included elsewhere."}
          </span>
        </label>
        <label>
          Refundable security deposit (₹)
          <input name="depositMinor" inputMode="decimal" />
          <span className="small">
            Shown separately from the cost. Blank means unknown.
          </span>
        </label>
        <label>
          Possible later cashback (₹)
          <input name="cashbackMinor" inputMode="decimal" />
          <span className="small">
            Never deducted from the total or used in ranking.
          </span>
        </label>
        {hotel && (
          <label>
            Meal inclusion
            <select name="meal" defaultValue="unknown">
              <option value="unknown">Not established</option>
              <option value="room-only">Room only</option>
              <option value="breakfast">
                Breakfast for every guest included
              </option>
              <option value="other">Other / mixed meal plan</option>
            </select>
          </label>
        )}
        <label>
          Cancellation terms
          <select value={cancel} onChange={(e) => setCancel(e.target.value)}>
            <option value="unknown">Not established</option>
            <option value="non-refundable">Non-refundable</option>
            <option value="free-until">Free until a stated deadline</option>
            {!hotel && (
              <option value="not-applicable">
                No reservation or prepayment to cancel
              </option>
            )}
          </select>
        </label>
        {cancel === "free-until" && (
          <label>
            Free-cancellation deadline (India time)
            <input
              name="cancelUntil"
              type="datetime-local"
              max={plan.arrival + "T23:59"}
              required
            />
          </label>
        )}
        <label>
          Payment timing
          <select name="payment" defaultValue="unknown">
            <option value="unknown">Not established</option>
            <option value="pay-now">Pay now</option>
            <option value="pay-at-venue">Pay at the venue</option>
          </select>
        </label>
        <label>
          Rate or offer eligibility
          <select
            aria-label="Rate or offer eligibility"
            value={eligibility}
            onChange={(e) => setEligibility(e.target.value)}
          >
            <option value="unknown">Not established</option>
            <option value="public">
              Public: no member, app, residency or card restriction
            </option>
            <option value="conditional-confirmed">
              Conditional: I checked the rules and qualify
            </option>
          </select>
        </label>
        {eligibility === "conditional-confirmed" && (
          <label className="hc-wide">
            Eligibility conditions, without personal details
            <input
              name="eligibilityDetails"
              maxLength={180}
              required
              placeholder="Member tier, app, residency or payment condition—not card numbers"
            />
            <span className="small">
              Different conditions remain separate, even if both offers appear
              cheaper.
            </span>
          </label>
        )}
        <label className="hc-check hc-wide">
          <input type="checkbox" name="complete" />I have included every
          mandatory cost and chosen extra for this exact plan. The amounts do
          not overlap.
        </label>
        <p className="hc-wide small">
          Unknown is safer than a guessed zero. Incomplete quotes can be saved,
          but cannot win a like-for-like comparison. Quotes older than 24 hours
          need rechecking; this limit is not a provider price guarantee.
        </p>
        {error && (
          <p
            className="hc-wide hc-error"
            role="alert"
            tabIndex={-1}
            ref={errorRef}
          >
            {error}
          </p>
        )}
        <div className="hc-wide hc-actions">
          <button className="hospitality-primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save my quote"}
          </button>
          <button
            className="hospitality-secondary"
            type="button"
            onClick={onCancel}
          >
            Cancel quote entry
          </button>
        </div>
      </form>
    </section>
  );
}

export default function HospitalityCompare({ kind }: { kind: VenueKind }) {
  const hotel = kind === "hotel";
  const root = hotel ? "/stays" : "/dining";
  const [params, setParams] = useSearchParams();
  const city = cityById(params.get("city"));
  const { disconnected } = usePwa();
  const blankPlan = (): QuotePlan => ({
    kind,
    city: city.id,
    arrival: "",
    departure: "",
    adults: 2,
    rooms: 1,
    childAges: [],
    rooming: "",
    time: "",
    diningMode: "dine-in",
  });
  const [draft, setDraft] = useState<QuotePlan>(blankPlan);
  const [plan, setPlan] = useState<QuotePlan | null>(null);
  const [query, setQuery] = useState("");
  const [official, setOfficial] = useState(false);
  const [budget, setBudget] = useState("");
  const [includeUnpriced, setIncludeUnpriced] = useState(true);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<PersonalQuote[]>([]);
  const [storageProblem, setStorageProblem] = useState("");
  const [message, setMessage] = useState("");
  const [planMessage, setPlanMessage] = useState("");
  const [editor, setEditor] = useState<{
    venue: ComparisonVenue;
    plan: QuotePlan;
  } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [now, setNow] = useState(Date.now());
  const planTitle = useRef<HTMLHeadingElement>(null);
  const resultsTitle = useRef<HTMLHeadingElement>(null);
  function load() {
    try {
      const data = readPersonalQuotes(
        localStorage.getItem(COMPARISON_STORAGE_KEY),
      );
      setQuotes(data.quotes);
      setStorageProblem(
        data.damaged
          ? "Some stored quotes could not be read. Download a recovery copy or clear the collection before saving more."
          : "",
      );
    } catch {
      setStorageProblem(
        "Browser storage is unavailable. Your quote cannot be saved until storage is allowed.",
      );
    }
  }
  useEffect(() => {
    load();
    const sync = (e: StorageEvent) => {
      if (!e.key || e.key === COMPARISON_STORAGE_KEY) load();
    };
    window.addEventListener("storage", sync);
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      window.removeEventListener("storage", sync);
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    setDraft((p) => ({ ...p, city: city.id }));
    setShortlist([]);
    setPlan((p) => (p ? { ...p, city: city.id } : p));
  }, [city.id]);
  useEffect(() => {
    if (!dirty) return;
    const before = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const leave = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element).closest?.("a");
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.download ||
        anchor.closest(".explore-dock, .engagement-bar")
      )
        return;
      const url = new URL(anchor.href, location.href);
      if (
        url.origin !== location.origin ||
        url.pathname + url.search === location.pathname + location.search
      )
        return;
      if (
        !window.confirm(
          "Leave this quote entry? Unsaved fields will be lost. Saved quotes remain on this device.",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", leave, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", leave, true);
    };
  }, [dirty]);
  const discard = () =>
    !dirty ||
    window.confirm(
      "Discard the unsaved quote entry? Your saved quotes will stay on this device.",
    );
  async function mutate(
    change: (old: PersonalQuote[]) => PersonalQuote[],
    clearDamaged = false,
  ): Promise<boolean> {
    const run = () => {
      try {
        const old = readPersonalQuotes(
          localStorage.getItem(COMPARISON_STORAGE_KEY),
        );
        if (old.damaged && !clearDamaged)
          throw Error(
            "Please download the recovery copy or clear unreadable data first.",
          );
        const next = change(old.quotes);
        const serialized = serializePersonalQuotes(next);
        localStorage.setItem(COMPARISON_STORAGE_KEY, serialized);
        if (localStorage.getItem(COMPARISON_STORAGE_KEY) !== serialized)
          throw Error("Another window changed the collection. Please retry.");
        setQuotes(next);
        setStorageProblem("");
        return true;
      } catch (e) {
        setStorageProblem(
          e instanceof Error && /collection|recovery|window/.test(e.message)
            ? e.message
            : "The quote was not saved. Storage may be blocked or full. Your entry is still here; retry after allowing space or storage.",
        );
        return false;
      }
    };
    // Serialise participating tabs where Web Locks exists; no account or server sync is implied.
    try {
      return navigator.locks
        ? await navigator.locks.request(COMPARISON_STORAGE_KEY, run)
        : run();
    } catch {
      setStorageProblem(
        "The browser could not update the collection. Your entry is still here.",
      );
      return false;
    }
  }
  async function save(q: PersonalQuote) {
    const ok = await mutate((old) => {
      if (old.length >= MAX_PERSONAL_QUOTES)
        throw Error(
          "The collection holds at most 30 hotel and dining quotes. Remove an old quote first.",
        );
      return [...old, q];
    });
    if (ok) {
      setNow(Date.now());
      setDirty(false);
      setEditor(null);
      setMessage(
        "Quote saved on this device only. No booking, reminder or message was sent.",
      );
    }
    return ok;
  }
  function openQuote(v: ComparisonVenue) {
    if (!plan) {
      setPlanMessage(
        "Set and apply your dates and party first, so prices refer to the same plan.",
      );
      planTitle.current?.focus();
      return;
    }
    if (!discard()) return;
    setDirty(false);
    setEditor({ venue: v, plan: { ...plan, childAges: [...plan.childAges] } });
    setMessage("");
  }
  function applyPlan(e: FormEvent) {
    e.preventDefault();
    const next = {
      ...draft,
      kind,
      city: city.id,
      departure: hotel ? draft.departure : draft.arrival,
      rooms: hotel ? draft.rooms : 1,
      childAges: hotel ? draft.childAges : [],
      rooming: hotel && draft.rooms > 1 ? draft.rooming.trim() : "",
      time: hotel ? "" : draft.time,
    };
    const error = planError(next);
    setPlanMessage(error || "");
    if (error) {
      planTitle.current?.focus();
      return;
    }
    if (!discard()) return;
    setDirty(false);
    setEditor(null);
    setPlan(next);
    setMessage(
      "Plan applied. Places below are a sourced collection, not confirmed availability.",
    );
    requestAnimationFrame(() => resultsTitle.current?.focus());
  }
  const all = venuesFor(kind, city.id, query, official);
  const matching = quotes.filter(
    (q) =>
      q.plan.kind === kind &&
      plan &&
      samePlan(q.plan, plan) &&
      venuesFor(kind, city.id).some((v) => v.id === q.venueId),
  );
  const minimum = (id: string) => {
    const values = matching
      .filter((q) => q.venueId === id && !quoteIssue(q, now))
      .map((q) => quoteCost(q).totalMinor!);
    return values.length ? Math.min(...values) : null;
  };
  const cap = parseQuoteMoney(budget);
  const invalidBudget = budget.trim() !== "" && cap === null;
  const shown = all.filter((v) => {
    const cost = minimum(v.id);
    return cost === null ? includeUnpriced : cap === null || cost <= cap;
  });
  const groups = comparisonGroups(matching, now);
  const collection = quotes.filter((q) => q.plan.kind === kind);
  const selected = COMPARISON_VENUES.filter((v) => shortlist.includes(v.id));
  const count = COMPARISON_VENUES.filter((v) => v.kind === kind).length;
  return (
    <>
      <Seo
        title={
          hotel
            ? "Compare hotels and your stay quotes"
            : "Compare restaurants and your meal quotes"
        }
        description="Compare sourced places and the full cost of quotes you enter. Your entries stay on this device; confirm prices and availability directly."
        path={root + "/compare"}
        index={false}
      />
      <Chrome>
        <div
          className={`hospitality hc-page ${hotel ? "hospitality-stays" : "hospitality-dining"}`}
        >
          <div className="hospitality-container">
            <nav
              className="hc-actions hc-breadcrumb"
              aria-label="Comparison sections"
            >
              <Link to={`${root}?city=${city.id}`}>
                ← {hotel ? "Hotels & stays" : "Dining & food"}
              </Link>
              <Link
                to={`${hotel ? "/dining/compare" : "/stays/compare"}?city=${city.id}`}
              >
                {hotel ? "Compare dining" : "Compare stays"}
              </Link>
              <Link to={`/stays/plan?city=${city.id}`}>Trip budget & stay questions</Link>
              <Link to={`/pet-friendly?city=${city.id}`}>
                Pet-friendly places
              </Link>
            </nav>
            <header className="hc-header">
              <span className="hospitality-eyebrow">
                DealMosaic / Compare with confidence
              </span>
              <h1>
                {hotel ? (
                  <>
                    The right stay.
                    <br />
                    <em>The whole cost.</em>
                  </>
                ) : (
                  <>
                    Your next table.
                    <br />
                    <em>A clearer bill.</em>
                  </>
                )}
              </h1>
              <p className="hospitality-lede">
                {hotel
                  ? "Shortlist real places. Put your hotel quotes side by side. See when a lower room price comes with different terms."
                  : "Find real places to eat. Compare your quotes for the same meal and see the cost after fees—not after hoped-for cashback."}
              </p>
              <p className="hc-disclosure">
                <strong>Your quotes, not a live price feed.</strong> Prices are
                entered by you; they are not fetched or verified by DealMosaic.
                Check current rates, availability and terms with the provider
                before booking or paying.
              </p>
              <div className="hc-facts">
                <span>
                  {count} selected {hotel ? "stays" : "dining places"}
                </span>
                <span>{CITIES.length} destination choices</span>
                <span>Commission never decides the order</span>
              </div>
            </header>
            <section className="hc-panel" aria-labelledby="hc-plan-title">
              <span className="hospitality-eyebrow">
                01 / Make the plan precise
              </span>
              <h2 id="hc-plan-title" ref={planTitle} tabIndex={-1}>
                {hotel
                  ? "Same dates. Same guests."
                  : "Same meal. Same occasion."}
              </h2>
              <form className="hc-form" onSubmit={applyPlan} noValidate>
                <label>
                  Destination
                  <select
                    aria-label="Destination"
                    value={city.id}
                    onChange={(e) => {
                      if (!discard()) return;
                      setEditor(null);
                      setDirty(false);
                      setParams({ city: e.target.value });
                    }}
                  >
                    {CITIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {hotel ? "Arrival date" : "Visit or order date"}
                  <input
                    type="date"
                    min={indiaToday()}
                    value={draft.arrival}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, arrival: e.target.value }))
                    }
                    required
                  />
                </label>
                {hotel ? (
                  <label>
                    Departure date
                    <input
                      type="date"
                      min={draft.arrival || indiaToday()}
                      value={draft.departure}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, departure: e.target.value }))
                      }
                      required
                    />
                  </label>
                ) : (
                  <label>
                    Visit or order time (India)
                    <input
                      type="time"
                      value={draft.time}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, time: e.target.value }))
                      }
                      required
                    />
                  </label>
                )}
                <label>
                  {hotel ? "Adults travelling" : "People eating"}
                  <select
                    value={draft.adults}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        adults: Number(e.target.value),
                      }))
                    }
                  >
                    {Array.from({ length: hotel ? 8 : 20 }, (_, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
                {hotel ? (
                  <>
                    <label>
                      Rooms needed
                      <select
                        value={draft.rooms}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            rooms: Number(e.target.value),
                          }))
                        }
                      >
                        {[1, 2, 3, 4].map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Children travelling
                      <select
                        value={draft.childAges.length}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            childAges: Array.from(
                              { length: Number(e.target.value) },
                              (_, i) => p.childAges[i] ?? -1,
                            ),
                          }))
                        }
                      >
                        {[0, 1, 2, 3, 4].map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    {draft.childAges.map((age, i) => (
                      <label key={i}>
                        Child {i + 1} age
                        <select
                          value={age}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              childAges: p.childAges.map((a, n) =>
                                n === i ? Number(e.target.value) : a,
                              ),
                            }))
                          }
                        >
                          <option value={-1}>Choose an age</option>
                          {Array.from({ length: 18 }, (_, a) => (
                            <option key={a}>{a}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                    {draft.rooms > 1 && (
                      <label className="hc-wide">
                        Room allocation, without names
                        <input
                          maxLength={180}
                          value={draft.rooming}
                          onChange={(e) =>
                            setDraft((p) => ({ ...p, rooming: e.target.value }))
                          }
                          placeholder="Room 1: 2 adults; Room 2: 1 adult + child aged 7"
                          required
                        />
                        <span className="small">
                          Use exactly this allocation with every provider.
                          Different allocations may change the price.
                        </span>
                      </label>
                    )}
                  </>
                ) : (
                  <label>
                    Dining format
                    <select
                      value={draft.diningMode}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          diningMode: e.target.value as QuotePlan["diningMode"],
                        }))
                      }
                    >
                      <option value="dine-in">Dine-in</option>
                      <option value="takeaway">Takeaway</option>
                      <option value="delivery">Delivery</option>
                    </select>
                    <span className="small">
                      A preference, not proof that every venue offers it.
                    </span>
                  </label>
                )}
                {planMessage && (
                  <p className="hc-wide hc-error" role="alert">
                    {planMessage}
                  </p>
                )}
                <div className="hc-wide hc-actions">
                  <button type="submit" className="hospitality-primary">
                    Apply my plan
                  </button>
                  {plan && (
                    <span className="small">Applied: {planLabel(plan)}</span>
                  )}
                </div>
              </form>
              <p className="small">
                Delhi NCR overlaps Gurugram and Noida. Listings do not establish
                availability, accessibility or admission for your party. Only
                sourced facts are shown; unsourced star ratings are not guessed.
              </p>
            </section>
            <section className="hc-section" aria-labelledby="hc-results-title">
              <span className="hospitality-eyebrow">
                02 / Find your shortlist
              </span>
              <h2 id="hc-results-title" ref={resultsTitle} tabIndex={-1}>
                {city.name}, thoughtfully compared.
              </h2>
              <div className="hc-form hc-filters">
                <label>
                  Find a place or neighbourhood
                  <input
                    type="search"
                    maxLength={100}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <label>
                  {hotel ? "Whole-stay" : "Whole-meal"} budget (₹)
                  <input
                    inputMode="decimal"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                  <span className="small">
                    Uses complete, comparable quotes for your applied plan—not
                    assumed market prices.
                  </span>
                </label>
                <label className="hc-check">
                  <input
                    type="checkbox"
                    checked={official}
                    onChange={(e) => setOfficial(e.target.checked)}
                  />
                  Official publication sources only
                </label>
                <label className="hc-check">
                  <input
                    type="checkbox"
                    checked={includeUnpriced}
                    onChange={(e) => setIncludeUnpriced(e.target.checked)}
                  />
                  Include places without a priced quote
                </label>
              </div>
              {invalidBudget && (
                <p role="alert" className="hc-error">
                  Enter a valid rupee budget, without commas or symbols. The
                  budget filter has not been applied.
                </p>
              )}
              <p className="small" role="status">
                {shown.length} selected places shown. Alphabetical order—not an
                endorsement or availability ranking.{" "}
                {cap !== null &&
                  "Unpriced places, if included, have not passed your budget check."}
              </p>
              <div className="hc-venues">
                {shown.map((v) => {
                  const cost = minimum(v.id);
                  return (
                    <article
                      className="hc-venue"
                      key={v.id}
                      data-comparison-venue={v.id}
                    >
                      <span className="hospitality-eyebrow">
                        {v.evidence === "official"
                          ? "Official publication"
                          : "Third-party publication"}
                      </span>
                      <h3>{v.name}</h3>
                      <p>{v.area}</p>
                      <div className="hc-price">
                        {cost === null ? (
                          <>
                            <strong>Add your quote</strong>
                            <span>No live price or budget confirmation</span>
                          </>
                        ) : (
                          <>
                            <strong>{inr(cost)}</strong>
                            <span>
                              Lowest entered total for this plan; room or meal
                              terms may differ
                            </span>
                          </>
                        )}
                      </div>
                      <details>
                        <summary>Source & things to confirm</summary>
                        <p>{v.note}</p>
                        <p className="small">
                          {v.publisher} · source reviewed {day(v.reviewedAt)}.{" "}
                          {sourceAge(v.reviewedAt) > 90
                            ? "Older evidence: recheck the information."
                            : "Source review is not a venue inspection."}{" "}
                          {v.petResearch
                            ? "This record comes from pet-policy research; confirm current admission and fees."
                            : "Pet admission and accessibility are not established here."}
                        </p>
                        <SourceLink venue={v} />
                      </details>
                      <div className="hc-actions">
                        <button
                          className="hospitality-primary"
                          onClick={() => openQuote(v)}
                        >
                          Add a quote
                          <span className="sr-only"> for {v.name}</span>
                        </button>
                        <button
                          className="hospitality-secondary"
                          aria-pressed={shortlist.includes(v.id)}
                          onClick={() => {
                            if (shortlist.includes(v.id))
                              setShortlist((ids) =>
                                ids.filter((id) => id !== v.id),
                              );
                            else if (shortlist.length < 4)
                              setShortlist((ids) => [...ids, v.id]);
                            else
                              setMessage(
                                "Compare up to four places at once. Remove one from the shortlist to add another.",
                              );
                          }}
                        >
                          {shortlist.includes(v.id)
                            ? "Remove from shortlist"
                            : "Shortlist"}
                          <span className="sr-only"> {v.name}</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {!shown.length && (
                <div className="hc-panel">
                  <h3>No match in this selected collection.</h3>
                  <p>
                    This does not mean the city has no available rooms or
                    tables. Try a different name, remove the budget limit, or
                    include places without quotes.
                  </p>
                  <button
                    className="hospitality-secondary"
                    onClick={() => {
                      setQuery("");
                      setBudget("");
                      setOfficial(false);
                      setIncludeUnpriced(true);
                    }}
                  >
                    Clear place filters
                  </button>
                  <p>
                    <Link to={`${root}?city=${city.id}`}>
                      Explore other providers and listed offers →
                    </Link>
                  </p>
                </div>
              )}
            </section>
            {selected.length > 0 && (
              <section className="hc-panel" aria-label="Place shortlist">
                <h2>Your place shortlist</h2>
                <p>
                  Temporary in this tab; changing destination clears this
                  shortlist. Saved quotes below survive a reload when browser
                  storage is available.
                </p>
                <div className="hc-venues">
                  {selected.map((v) => (
                    <article key={v.id} className="hc-venue">
                      <h3>{v.name}</h3>
                      <p>{v.area}</p>
                      <p>{v.note}</p>
                      <p className="small">
                        Accessibility, exact room or menu, star category and
                        current availability: confirm with the venue. Source
                        reviewed {day(v.reviewedAt)}.
                      </p>
                      <SourceLink venue={v} />
                      <div className="hc-actions">
                        <button
                          className="hospitality-primary"
                          onClick={() => openQuote(v)}
                        >
                          Add a quote
                          <span className="sr-only">
                            {" "}
                            for shortlisted {v.name}
                          </span>
                        </button>
                        <button
                          className="hospitality-secondary"
                          onClick={() =>
                            setShortlist((ids) =>
                              ids.filter((id) => id !== v.id),
                            )
                          }
                        >
                          Remove
                          <span className="sr-only">
                            {" "}
                            {v.name} from comparison
                          </span>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
            <div aria-live="polite">
              {message && <p className="hc-feedback">{message}</p>}
            </div>
            {storageProblem && (
              <section className="hc-panel" role="alert">
                <p>{storageProblem}</p>
                <div className="hc-actions">
                  <button
                    className="hospitality-secondary"
                    onClick={() => {
                      try {
                        download(
                          "dealmosaic-quote-recovery.txt",
                          localStorage.getItem(COMPARISON_STORAGE_KEY) ||
                            "No stored data",
                          "text/plain",
                        );
                      } catch {
                        setMessage(
                          "Storage could not be read. The recovery copy was not downloaded.",
                        );
                      }
                    }}
                  >
                    Download recovery copy
                  </button>
                  <button
                    className="hospitality-secondary"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Clear all saved hotel and dining quotes on this device? This cannot be undone.",
                        )
                      )
                        void mutate(() => [], true);
                    }}
                  >
                    Clear unreadable collection
                  </button>
                </div>
              </section>
            )}
            {editor && (
              <QuoteEntry
                key={editor.venue.id}
                venue={editor.venue}
                plan={editor.plan}
                onSave={save}
                onDirty={() => setDirty(true)}
                onCancel={() => {
                  if (discard()) {
                    setEditor(null);
                    setDirty(false);
                  }
                }}
              />
            )}
            <section className="hc-section" aria-labelledby="hc-quotes-title">
              <span className="hospitality-eyebrow">
                03 / Compare what you would actually pay
              </span>
              <h2 id="hc-quotes-title">
                Your {hotel ? "stay" : "meal"} quote collection
              </h2>
              <p>
                Saved on this device, not in your account. Anyone using this
                browser may see these dates and party details. No automatic
                price monitoring, reminders, reservations or messages are
                created. Do not enter contact or payment details.
              </p>
              {plan && (
                <p className="small">
                  {matching.length} quotes match the applied plan. Comparisons
                  below also require the same place, exact room or meal
                  description, inclusions, cancellation deadline and payment
                  timing. They rely on your entries, not provider verification.
                </p>
              )}
              {groups.map((group, i) => (
                <article className="hc-match" key={group.quotes[0]!.id}>
                  <span className="hospitality-eyebrow">
                    Matching entered conditions · group {i + 1}
                  </span>
                  <h3>
                    {
                      COMPARISON_VENUES.find(
                        (v) => v.id === group.quotes[0]!.venueId,
                      )?.name
                    }
                  </h3>
                  <p>{group.quotes[0]!.item}</p>
                  <ul>
                    {group.quotes.map((q) => (
                      <li key={q.id}>
                        <strong>
                          {q.provider}: {inr(quoteCost(q).totalMinor!)}
                        </strong>{" "}
                        —{" "}
                        {group.lowestIds.includes(q.id)
                          ? "Lowest entered total in this matching group"
                          : `${inr(quoteCost(q).totalMinor! - group.lowestMinor)} above this group’s lowest entered total`}
                      </li>
                    ))}
                  </ul>
                  <p className="small">
                    Not a cheapest-anywhere or availability guarantee. A tie is
                    shown for every equally low total. Recheck with the provider
                    before paying.
                  </p>
                </article>
              ))}
              {!groups.length && (
                <p className="hc-feedback">
                  No like-for-like group yet. Add quotes from two different
                  providers for the same applied plan and exact conditions.
                  Unknown or stale entries never win by default.
                </p>
              )}
              {!collection.length ? (
                <p>
                  No {hotel ? "hotel" : "dining"} quotes saved here. Apply your
                  plan and choose “Add a quote” on a place above.
                </p>
              ) : (
                <>
                  <div className="hc-actions">
                    <button
                      className="hospitality-secondary"
                      onClick={() =>
                        download(
                          `dealmosaic-${kind}-quotes.csv`,
                          quoteCsv(collection),
                          "text/csv;charset=utf-8",
                        )
                      }
                    >
                      Export {hotel ? "hotel" : "dining"} quotes
                    </button>
                    <button
                      className="hospitality-secondary"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete all ${hotel ? "hotel" : "dining"} quotes on this device? This cannot be undone.`,
                          )
                        )
                          void mutate((old) =>
                            old.filter((q) => q.plan.kind !== kind),
                          );
                      }}
                    >
                      Clear {hotel ? "hotel" : "dining"} quotes
                    </button>
                  </div>
                  <div className="hc-venues hc-quote-list">
                    {collection.map((q) => {
                      const c = quoteCost(q);
                      const issue = quoteIssue(q, now);
                      return (
                        <article
                          className="hc-venue"
                          key={q.id}
                          data-personal-quote={q.id}
                        >
                          <span className="hospitality-eyebrow">
                            Personal quote · not provider-verified
                          </span>
                          <h3>{q.provider}</h3>
                          <p>
                            <strong>
                              {
                                COMPARISON_VENUES.find(
                                  (v) => v.id === q.venueId,
                                )?.name
                              }
                            </strong>
                            <br />
                            {planLabel(q.plan)}
                            {q.plan.rooms > 1 && (
                              <>
                                <br />
                                Room allocation: {q.plan.rooming}
                              </>
                            )}
                          </p>
                          <p>{q.item}</p>
                          <dl>
                            <dt>
                              {c.totalMinor === null
                                ? "Known costs only—not the full total"
                                : "Total from your complete cost entries"}
                            </dt>
                            <dd className="hc-amount">
                              {inr(c.totalMinor ?? c.knownMinor)}
                            </dd>
                            <dt>Refundable deposit, separate</dt>
                            <dd>
                              {q.depositMinor === null
                                ? "Unknown"
                                : inr(q.depositMinor)}
                            </dd>
                            <dt>Full cost plus refundable deposit</dt>
                            <dd>
                              {c.cashNeededMinor === null
                                ? "Not established"
                                : inr(c.cashNeededMinor)}
                            </dd>
                            <dt>Possible later cashback—not deducted</dt>
                            <dd>
                              {q.cashbackMinor === null
                                ? "Unknown"
                                : inr(q.cashbackMinor)}
                            </dd>
                            <dt>Eligibility entered</dt>
                            <dd>
                              {q.eligibility === "public"
                                ? "Public rate / offer"
                                : q.eligibility === "conditional-confirmed"
                                  ? `Conditional — you confirmed: ${q.eligibilityDetails}`
                                  : "Not established"}
                            </dd>
                            <dt>Conditions entered</dt>
                            <dd>
                              {hotel ? `${q.meal}; ` : ""}
                              {q.cancellation}
                              {q.cancelUntil
                                ? ` until ${q.cancelUntil.replace("T", " ")} India time`
                                : ""}
                              ; {q.payment}
                            </dd>
                          </dl>
                          <p className="small">
                            Recorded{" "}
                            {new Date(q.recordedAt).toLocaleString("en-IN")}.{" "}
                            {issue ||
                              "Recheck the price, charges and availability before committing."}{" "}
                            {plan &&
                              !samePlan(q.plan, plan) &&
                              "Not part of the currently applied plan."}
                          </p>
                          <button
                            className="hospitality-secondary"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Remove the quote entered for ${q.provider}?`,
                                )
                              )
                                void mutate((old) =>
                                  old.filter((x) => x.id !== q.id),
                                );
                            }}
                          >
                            Remove quote
                            <span className="sr-only"> from {q.provider}</span>
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
            <section className="hc-panel">
              <h2>A useful comparison, without false certainty.</h2>
              <p>
                Places are selected from published sources, not an exhaustive
                inventory. Existing pet-policy records and separately sourced
                general places are included. Brand names identify places, not
                partnerships. We do not copy hotel photographs, invent reviews
                or turn unknown fees into zero.
              </p>
              <p>
                {disconnected
                  ? "You are disconnected. Local entries are not current provider prices; external sources require a connection."
                  : "Booking, payment and support remain with the provider you choose."}{" "}
                Ordinary source links here are not affiliate links. Elsewhere on
                DealMosaic, clearly disclosed offer links may earn a commission;
                that never changes this comparison order.
              </p>
              <div className="hc-actions">
                <Link
                  className="hospitality-secondary"
                  to={`${root}?city=${city.id}#hospitality-offers-title`}
                >
                  Check listed offers and eligibility
                </Link>
                <Link className="hospitality-secondary" to="/how-we-rank">
                  How comparisons work
                </Link>
              </div>
            </section>
          </div>
        </div>
      </Chrome>
    </>
  );
}
