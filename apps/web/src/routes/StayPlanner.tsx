import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Chrome } from "../components/PublicChrome";
import { Seo } from "../lib/seo";
import { CITIES, cityById } from "../lib/hospitality";
import {
  BUDGET_ITEMS,
  NEEDS,
  budgetTotal,
  enquiryText,
  rebooking,
  type Need,
} from "../lib/stay-planner";
import "../design/hospitality.css";
import "../design/hospitality-comparison.css";
import "../design/stay-planner.css";
const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n / 100);
const empty = () => BUDGET_ITEMS.map(() => "");
const initialRebook = {
  original: "",
  paid: "",
  refund: "",
  replacement: "",
  fee: "",
};
const REBOOK_LABELS = {
  original: "Original full-stay total",
  paid: "Already paid for the original stay",
  refund: "Expected cash refund on cancellation",
  replacement: "Replacement full-stay total",
  fee: "Additional cancellation fee not already withheld",
};
export default function StayPlanner() {
  const [params] = useSearchParams();
  const [city, setCity] = useState(cityById(params.get("city") || "").id);
  const [need, setNeed] = useState<Need>("general");
  const [a, setA] = useState(empty),
    [b, setB] = useState(empty);
  const [budget, setBudget] = useState<{ a: number; b: number } | null>(null);
  const [budgetError, setBudgetError] = useState("");
  const [same, setSame] = useState(false);
  const [values, setValues] = useState(initialRebook),
    [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof rebooking> | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const draft = enquiryText(need, cityById(city).name);
  function compare(e: FormEvent) {
    e.preventDefault();
    const x = budgetTotal(a),
      y = budgetTotal(b);
    if (x === null || y === null || !same) {
      setBudget(null);
      setBudgetError(
        !same
          ? "Confirm that both plans cover the same dates and travellers."
          : "Complete every cost category for both plans. Blank means unknown, not free. Use 0 only where appropriate.",
      );
      return;
    }
    setBudgetError("");
    setBudget({ a: x, b: y });
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setMessage(
        "Checklist copied. Review it and choose the recipient yourself; nothing has been sent.",
      );
    } catch {
      setMessage(
        "Copy is unavailable in this browser. Select the text below, or download the checklist.",
      );
    }
  }
  function download() {
    try {
      const url = URL.createObjectURL(
        new Blob([draft], { type: "text/plain;charset=utf-8" }),
      );
      const el = document.createElement("a");
      el.href = url;
      el.download = "dealmosaic-stay-questions.txt";
      document.body.append(el);
      el.click();
      el.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setMessage(
        "Checklist download requested. Nothing has been sent to a hotel.",
      );
    } catch {
      setMessage(
        "Download is unavailable. Select and copy the checklist text below.",
      );
    }
  }
  function clear() {
    setA(empty());
    setB(empty());
    setBudget(null);
    setBudgetError("");
    setSame(false);
    setValues(initialRebook);
    setConfirmed(false);
    setResult(null);
    setNeed("general");
    setMessage("All entered planning figures cleared.");
  }
  return (
    <>
      <Seo
        title="Plan the whole trip, not just the room"
        description="Compare your whole-trip budgets, prepare stay questions and check rebooking arithmetic. No guessed room prices or automatic bookings."
        path="/stays/plan"
        index={false}
      />
      <Chrome>
        <div className="hospitality hospitality-stays hc-page sp-page">
          <div className="hospitality-container">
            <nav
              className="hc-actions hc-breadcrumb"
              aria-label="Stay planning sections"
            >
              <Link to={`/stays?city=${city}`}>← Hotels & stays</Link>
              <Link to={`/stays/compare?city=${city}`}>
                Compare stay quotes
              </Link>
              <Link to={`/dining/compare?city=${city}`}>
                Compare dining quotes
              </Link>
            </nav>
            <header>
              <span className="hospitality-eyebrow">
                Small checks. Better trips.
              </span>
              <h1>
                Plan the whole trip,
                <br />
                not just the room.
              </h1>
              <p>
                A cheaper room can mean a more expensive trip. Put your own
                costs side by side, ask the right questions and check the cost
                of changing a booking.
              </p>
              <p className="hospitality-note">
                No sign-up needed. Figures stay only in this open page—not
                saved, synced or sent to a hotel. Use Clear on a shared device;
                your browser may retain an open page. These are planning tools,
                not live prices, booking services or automatic alerts.
              </p>
            </header>
            <nav className="hc-actions" aria-label="Planning tools">
              <a className="hospitality-secondary" href="#trip-budget">
                Trip budget
              </a>
              <a className="hospitality-secondary" href="#stay-questions">
                Stay questions
              </a>
              <a className="hospitality-secondary" href="#rebooking-check">
                Rebooking check
              </a>
            </nav>
            <section
              id="trip-budget"
              className="sp-card"
              aria-labelledby="budget-title"
            >
              <h2 id="budget-title">Which plan costs less overall?</h2>
              <p>
                Enter rupees for the <strong>whole party and whole trip</strong>
                —not per person or per night. Include confirmed taxes and
                mandatory charges. Food and other estimates remain your
                assumptions, not verified prices.
              </p>
              <form
                autoComplete="off"
                onSubmit={compare}
                onChange={() => {
                  setBudget(null);
                  setBudgetError("");
                }}
              >
                <div className="sp-grid">
                  {[a, b].map((rows, i) => (
                    <fieldset key={i}>
                      <legend>Plan {i === 0 ? "A" : "B"}</legend>
                      {BUDGET_ITEMS.map((label, j) => (
                        <label key={label}>
                          {label}
                          <input
                            aria-label={`Plan ${i === 0 ? "A" : "B"}: ${label}`}
                            type="text"
                            inputMode="decimal"
                            maxLength={11}
                            value={rows[j]}
                            onChange={(e) => {
                              const next = [...rows];
                              next[j] = e.target.value;
                              (i === 0 ? setA : setB)(next);
                            }}
                            placeholder="Unknown until entered"
                          />
                        </label>
                      ))}
                    </fieldset>
                  ))}
                </div>
                <p className="small">
                  Do not deduct cashback or refundable security deposits. Keep
                  deposits aside as extra cash you may need; avoid counting
                  included meals twice. A blank cost never becomes zero.
                </p>
                <label className="sp-check">
                  <input
                    type="checkbox"
                    checked={same}
                    onChange={(e) => setSame(e.target.checked)}
                  />
                  Both plans cover the same dates and travellers; I have
                  considered differences in inclusions and cancellation terms.
                </label>
                <button className="hospitality-primary" type="submit">
                  Compare trip budgets
                </button>
              </form>
              {budgetError && <p role="alert">{budgetError}</p>}
              {budget && (
                <div className="sp-result" role="status">
                  <p>
                    Plan A: <strong>{inr(budget.a)}</strong> · Plan B:{" "}
                    <strong>{inr(budget.b)}</strong>
                  </p>
                  <p>
                    {budget.a === budget.b
                      ? "Both entered budgets are equal."
                      : `Plan ${budget.a < budget.b ? "A" : "B"} has the lower entered budget by ${inr(Math.abs(budget.a - budget.b))}.`}
                  </p>
                  <p className="small">
                    Arithmetic comparison only—not a best-hotel recommendation,
                    quote or availability check.
                  </p>
                </div>
              )}
            </section>
            <section
              id="stay-questions"
              className="sp-card"
              aria-labelledby="questions-title"
            >
              <h2 id="questions-title">Ask before you book</h2>
              <p>
                A practical checklist for your trip—not a claim that any hotel
                meets these requirements. Obtain a written reply from a verified
                hotel contact.
              </p>
              <div className="sp-grid">
                <label>
                  Destination
                  <select
                    aria-label="Destination"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setMessage("");
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
                  Your stay needs
                  <select
                    aria-label="Your stay needs"
                    value={need}
                    onChange={(e) => {
                      setNeed(e.target.value as Need);
                      setMessage("");
                    }}
                  >
                    {Object.entries(NEEDS).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <textarea
                className="sp-draft"
                aria-label="Stay questions to review and copy"
                value={draft}
                readOnly
                rows={15}
              />
              <div className="hc-actions">
                <button className="hospitality-primary" onClick={copy}>
                  Copy stay questions
                </button>
                <button className="hospitality-secondary" onClick={download}>
                  Download questions
                </button>
              </div>
              <p className="small">
                No lead has been submitted, no room held and no reply promised.
                Only the generic checklist is copied or downloaded; budget and
                rebooking figures are excluded. Do not add card numbers, ID
                copies or medical records.
              </p>
              <div className="hc-actions">
                <Link to={`/dining?city=${city}`}>
                  Explore dining in this destination →
                </Link>
                <Link to="/browse">Compare shopping essentials →</Link>
                <Link to={`/pet-friendly?city=${city}`}>
                  Pet-friendly research →
                </Link>
              </div>
              <p className="small">
                These are separate discovery tools. Delivery, outlet coverage,
                pet acceptance and discounts must be checked for the exact
                property and dates.
              </p>
            </section>
            <section
              id="rebooking-check"
              className="sp-card"
              aria-labelledby="rebook-title"
            >
              <h2 id="rebook-title">Is a lower room price worth switching?</h2>
              <p>
                Check the financial difference before taking any action. Use the
                same rooms, guests, dates, meals, payment and cancellation
                conditions. Enter expected <strong>cash</strong> refund—not a
                voucher or cashback.
              </p>
              <form
                autoComplete="off"
                onSubmit={(e) => {
                  e.preventDefault();
                  setResult(rebooking(values, confirmed));
                }}
                onChange={() => setResult(null)}
              >
                <div className="sp-grid">
                  {Object.entries(REBOOK_LABELS).map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        type="text"
                        inputMode="decimal"
                        maxLength={11}
                        value={values[key as keyof typeof values]}
                        onChange={(e) =>
                          setValues({ ...values, [key]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
                <p className="small">
                  Refund must already account for deductions. Put only a
                  separate, additional cancellation charge in the fee field to
                  avoid double-counting. Exclude refundable security deposits
                  from every field.
                </p>
                <label className="sp-check">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  I checked matching stay terms, current replacement
                  availability, the cancellation deadline and time zone, and
                  that any unpaid original balance is waived on cancellation.
                </label>
                <button className="hospitality-primary" type="submit">
                  Check rebooking costs
                </button>
              </form>
              {result &&
                ("error" in result ? (
                  <p role="alert">{result.error}</p>
                ) : (
                  <div className="sp-result" role="status">
                    <p>
                      Keep original: <strong>{inr(result.keep)}</strong>
                      <br />
                      Switch, including cancellation loss:{" "}
                      <strong>{inr(result.switch)}</strong>
                    </p>
                    <p>
                      {result.difference > 0
                        ? `Potential saving from your figures: ${inr(result.difference)}.`
                        : result.difference === 0
                          ? "No financial saving from these figures."
                          : `Switching costs ${inr(-result.difference)} more from these figures.`}
                    </p>
                    <p>
                      Additional cash before any refund arrives:{" "}
                      <strong>{inr(result.additionalCash)}</strong>, assuming
                      the replacement is paid in full now.
                    </p>
                    <p className="small">
                      Do not cancel based on this calculation alone. Confirm
                      replacement availability and terms, loss of any original
                      benefits, and refund timing with the providers. DealMosaic
                      cannot cancel, rebook, refund or guarantee room
                      availability.
                    </p>
                  </div>
                ))}
            </section>
            <p role="status" aria-live="polite">
              {message}
            </p>
            <button className="hospitality-secondary" onClick={clear}>
              Clear all planning figures
            </button>
            <p className="small">
              Confirm all prices and policies directly before booking. A lower
              entered budget is not a promise of savings.
            </p>
          </div>
        </div>
      </Chrome>
    </>
  );
}
