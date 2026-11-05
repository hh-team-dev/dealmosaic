import { useEffect, useState, useRef, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Chrome } from "../components/PublicChrome";
import { Seo } from "../lib/seo";
import { usePwa } from "../lib/pwa";
import { useToast } from "../components/Toast";
import { CITIES, cityById, indiaToday, rupees } from "../lib/hospitality";
import {
  PET_VENUES,
  cityMatches,
  eligiblePetOffers,
  filterPetVenues,
  petCity,
  petCost,
  petMap,
  petMessage,
  safePetUrl,
  sourceAge,
  type PetVenue,
} from "../lib/pets";
import "../design/hospitality.css";
import "../design/pets.css";

function External({ href, children }: { href: string; children: ReactNode }) {
  const { disconnected } = usePwa();
  return disconnected || !safePetUrl(href) ? (
    <span className="hospitality-link" aria-disabled="true">
      Reconnect to view source
    </span>
  ) : (
    <a
      className="hospitality-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <span className="pet-new-tab"> ↗ (new tab)</span>
    </a>
  );
}
function Paw() {
  return (
    <svg
      className="pet-paw"
      width="120"
      height="110"
      viewBox="0 0 120 110"
      aria-hidden="true"
    >
      <ellipse cx="25" cy="36" rx="11" ry="16" />
      <ellipse cx="48" cy="22" rx="11" ry="16" />
      <ellipse cx="76" cy="23" rx="11" ry="16" />
      <ellipse cx="98" cy="39" rx="11" ry="16" />
      <path d="M29 81c-2-14 12-36 31-36s34 24 30 38c-5 16-19 5-30 5S32 99 29 81Z" />
    </svg>
  );
}
function Venue({
  venue,
  today,
  onPlan,
}: {
  venue: PetVenue;
  today: string;
  onPlan: (v: PetVenue) => void;
}) {
  const stale = sourceAge(venue.reviewedAt, today) > 90;
  return (
    <article className="pet-card" data-venue-id={venue.id}>
      <div className="pet-card-top">
        <span className="hospitality-eyebrow">
          {venue.kind === "hotel" ? "Hotel / stay" : "Restaurant / café"}
        </span>
        <span className="pet-evidence">
          {venue.sources[0]!.type === "official"
            ? "Official publication"
            : "Third-party evidence"}
        </span>
      </div>
      <h3>{venue.name}</h3>
      <p className="pet-area">{venue.area}</p>
      <p>{venue.summary}</p>
      <p className="pet-small">
        {venue.species.length
          ? `Specifically mentioned: ${venue.species.map((x) => (x === "dog" ? "dogs" : "cats")).join(", ")}.`
          : "Pet species not specified."}{" "}
        Other species require direct confirmation.
      </p>
      {venue.caution && <p className="pet-caution">{venue.caution}</p>}
      <p className="pet-small">
        Source review:{" "}
        <time dateTime={venue.reviewedAt}>{venue.reviewedAt}</time>.{" "}
        {stale
          ? "Review overdue — recheck before relying on these details."
          : "Not a direct venue confirmation."}
      </p>
      <div className="pet-source-links">
        {venue.sources.map((s) => (
          <div key={s.url}>
            <External href={s.url}>{`[${s.ref}] ${s.publisher}`}</External>
            <span className="pet-small">
              {s.method === "page"
                ? " Page text reviewed."
                : " Indexed page excerpt reviewed; live page not confirmed."}
            </span>
          </div>
        ))}
      </div>
      <details>
        <summary>Pet rules, fees & access</summary>
        <dl>
          <dt>Pet charges</dt>
          <dd>{venue.fee}</dd>
          <dt>Size / number limits</dt>
          <dd>{venue.limits}</dd>
          <dt>Room or seating access</dt>
          <dd>{venue.access}</dd>
        </dl>
        <p className="pet-small">
          Confirm current operation, dates, exact branch and admission in
          writing before paying or travelling. A fee is not a deal; hotel
          admission does not imply restaurant admission.
        </p>
      </details>
      <div className="pet-actions">
        <External href={petMap(venue.city, venue.kind, venue)}>
          Find this place on Maps
        </External>
        <button className="hospitality-secondary" onClick={() => onPlan(venue)}>
          Prepare questions for {venue.name}
        </button>
      </div>
    </article>
  );
}
function PetPlanning({ venue }: { venue: PetVenue | null }) {
  const [pet, setPet] = useState("dog"),
    [count, setCount] = useState("1"),
    [weight, setWeight] = useState("");
  const [amounts, setAmounts] = useState(["", "", "", "", ""]);
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState("");
  const message = petMessage(venue?.name || "[venue name]", pet, count, weight);
  const cost = show ? petCost(amounts) : null;
  useEffect(() => setCopied(""), [message]);
  useEffect(() => {
    setAmounts(["", "", "", "", ""]);
    setShow(false);
  }, [venue?.id]);
  return (
    <section
      className="hospitality-section pet-planning"
      id="pet-planning"
      aria-labelledby="pet-plan-title"
    >
      <span className="hospitality-eyebrow">
        A better trip starts before you leave
      </span>
      <h2 id="pet-plan-title">Confirm the welcome. Know the full cost.</h2>
      <p>
        {venue
          ? `Preparing questions for ${venue.name}.`
          : "Choose a venue’s “Prepare questions” button, or use this general template."}{" "}
        Changing destination clears planning entries. Nothing here contacts or
        books a venue. These entries stay in page memory and are not included in
        copied directory links.
      </p>
      <div className="pet-tools">
        <div>
          <h3>Ask before you arrive</h3>
          <div className="pet-fields">
            <label>
              My pet
              <select value={pet} onChange={(e) => setPet(e.target.value)}>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="other pet">
                  Other pet — specify in message
                </option>
              </select>
            </label>
            <label>
              Number of pets
              <input
                type="number"
                min="1"
                max="9"
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </label>
            <label>
              Weight per pet (kg, optional)
              <input
                inputMode="decimal"
                value={weight}
                maxLength={5}
                onChange={(e) => setWeight(e.target.value)}
              />
            </label>
          </div>
          <label>
            Confirmation message
            <textarea
              rows={9}
              readOnly
              value={message}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <button
            className="hospitality-primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(message);
                setCopied(
                  "Message copied. Add your dates and send it yourself through the venue’s official contact channel.",
                );
              } catch {
                setCopied(
                  "Copy is unavailable. Select and copy the message above manually.",
                );
              }
            }}
          >
            Copy questions — not send
          </button>
          <p role="status" className="pet-small">
            {copied}
          </p>
        </div>
        <div>
          <h3>Pet-inclusive cost check</h3>
          <p className="pet-small">
            Use confirmed totals including taxes. Enter every field; use 0 only
            when that charge or discount is confirmed absent. No rate or tax is
            calculated for you.
          </p>
          <div className="pet-fields">
            {[
              "Room or meal total (₹)",
              "Total pet charges (₹)",
              "Other mandatory charges (₹)",
              "Confirmed instant discount (₹)",
              "Refundable deposit (₹)",
            ].map((label, i) => (
              <label key={label}>
                {label}
                <input
                  inputMode="decimal"
                  value={amounts[i]}
                  onChange={(e) => {
                    setAmounts((a) =>
                      a.map((v, j) => (j === i ? e.target.value : v)),
                    );
                    setShow(false);
                  }}
                />
              </label>
            ))}
          </div>
          <button className="hospitality-primary" onClick={() => setShow(true)}>
            Check my entered total
          </button>
          {show && (
            <div className="hospitality-result" role="status">
              {cost ? (
                <>
                  <p>
                    Cost after entered discount:{" "}
                    <strong>{rupees(cost.cost)}</strong>
                  </p>
                  <p>Refundable deposit: {rupees(cost.deposit)}</p>
                  <p>
                    Upfront payment including deposit:{" "}
                    <strong>{rupees(cost.upfront)}</strong>
                  </p>
                  <p className="pet-small">
                    Deposit refunds depend on the venue’s conditions. Cashback
                    is excluded. These are your entered amounts, not a live
                    quote or booking.
                  </p>
                </>
              ) : (
                <p>
                  Enter all five valid non-negative amounts (up to two decimal
                  places). Discount cannot exceed the entered cost.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <details>
        <summary>Before-you-go checklist</summary>
        <ul>
          <li>
            Get written permission for your exact species, breed, size, count
            and dates.
          </li>
          <li>
            Confirm permitted rooms or indoor/outdoor tables, supervision rules
            and cancellation terms if entry is refused.
          </li>
          <li>
            Ask about vaccinations and documents. Carry a lead/carrier, water
            and familiar food; do not upload pet records here.
          </li>
          <li>
            Ask your vet about travel suitability and find a local veterinary
            contact before departure.
          </li>
          <li>
            Assistance-animal access is a separate question from a leisure-pet
            policy; this directory does not determine legal access rights.
          </li>
        </ul>
      </details>
    </section>
  );
}
export default function PetFriendly() {
  const [params, setParams] = useSearchParams();
  const city = petCity(params.get("city"));
  const rawKind = params.get("type");
  const kind = ["hotel", "restaurant"].includes(rawKind || "")
    ? rawKind!
    : "all";
  const [species, setSpecies] = useState("all"),
    [evidence, setEvidence] = useState("all"),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<PetVenue | null>(null),
    [today, setToday] = useState(indiaToday);
  const planningDirty = useRef(false);
  const beforeLeaving = (event: { preventDefault: () => void }) => {
    if (
      planningDirty.current &&
      !window.confirm(
        "Leave pet planning? Unsaved pet details and entered costs will be cleared. No message, booking or payment will be sent.",
      )
    )
      event.preventDefault();
  };
  const toast = useToast();
  const { disconnected } = usePwa();
  useEffect(() => {
    const timer = setInterval(() => setToday(indiaToday()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setSelected(null);
    setQuery("");
  }, [city]);
  const venues = filterPetVenues({ city, kind, species, evidence, query });
  const offers = disconnected
    ? []
    : eligiblePetOffers(undefined, today).filter((o) =>
        cityMatches(
          PET_VENUES.find((v) => v.id === o.venueId)!,
          city,
        ),
      );
  const change = (key: string, value: string) => {
    // Read the current URL so two quick selections cannot overwrite a pending React render.
    const next = new URLSearchParams(location.search);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };
  const reset = () => {
    setParams({});
    setSpecies("all");
    setEvidence("all");
    setQuery("");
    setSelected(null);
  };
  return (
    <>
      <Seo
        title="Pet-friendly hotels & restaurants: sourced places, clearer policies"
        description="Explore sourced pet-friendly hotel and restaurant entries across 18 destination choices. Check species, fees, restrictions, evidence and separately matched offers before you go."
        path="/pet-friendly"
      />
      <Chrome>
        <div
          className="hospitality hospitality-stays pet-directory"
          onInput={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest("#pet-planning")
            )
              planningDirty.current = true;
          }}
        >
          <div className="hospitality-container">
            <header className="pet-hero">
              <div>
                <span className="hospitality-eyebrow">
                  DealMosaic / Stay. Dine. Bring your companion.
                </span>
                <h1>
                  Good trips include
                  <br />
                  your best friend.
                </h1>
                <p>
                  Find a place for both of you—not just a “pets allowed” label.
                  Explore hotels, cafés and restaurants, with or without a deal,
                  and ask the questions that make the welcome real.
                </p>
                <div className="pet-actions">
                  <a className="hospitality-primary" href="#pet-directory-list">
                    Explore sourced places ↓
                  </a>
                  <a className="hospitality-secondary" href="#pet-offers">
                    Pet-friendly offers ↓
                  </a>
                  <a className="hospitality-secondary" href="#pet-planning">
                    Plan with confidence ↓
                  </a>
                </div>
              </div>
              <Paw />
            </header>
            <div className="pet-trust">
              <strong>
                {PET_VENUES.length} sourced entries · {CITIES.length}{" "}
                destination choices
              </strong>
              <p>
                Not an exhaustive list or a live availability feed. Official
                publications and third-party reports are labelled separately;
                none means your pet’s admission is guaranteed. Dogs, cats and
                other pets can have different rules. Restaurant admission is
                never inferred from a hotel’s policy.
              </p>
              {disconnected && (
                <p role="status">
                  Offline: reference information only. Source links and offer
                  actions need a connection; policies may have changed.
                </p>
              )}
            </div>
            <section
              className="hospitality-section"
              id="pet-directory-list"
              aria-labelledby="pet-directory-title"
            >
              <h2 id="pet-directory-title">
                Their kind of welcome. Your kind of place.
              </h2>
              <div className="pet-filters">
                <label>
                  Pet destination
                  <select
                    value={city}
                    onChange={(e) => change("city", e.target.value)}
                  >
                    <option value="all">
                      All {CITIES.length} destinations
                    </option>
                    {CITIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Place type
                  <select
                    value={kind}
                    onChange={(e) => change("type", e.target.value)}
                  >
                    <option value="all">Hotels & restaurants together</option>
                    <option value="hotel">Hotels & stays</option>
                    <option value="restaurant">Restaurants & cafés</option>
                  </select>
                </label>
                <label>
                  Pet mentions
                  <select
                    value={species}
                    onChange={(e) => setSpecies(e.target.value)}
                  >
                    <option value="all">
                      All — including unspecified species
                    </option>
                    <option value="dog">Dogs explicitly mentioned</option>
                    <option value="cat">Cats explicitly mentioned</option>
                  </select>
                </label>
                <label>
                  Evidence
                  <select
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                  >
                    <option value="all">All sourced entries</option>
                    <option value="official">Official publications only</option>
                  </select>
                </label>
                <label>
                  Find a place or neighbourhood
                  <input
                    type="search"
                    value={query}
                    maxLength={100}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>
              <div className="pet-actions">
                <button className="hospitality-secondary" onClick={reset}>
                  Reset directory filters
                </button>
                <button
                  className="hospitality-secondary"
                  onClick={async () => {
                    const u = new URL("/pet-friendly", location.origin);
                    if (city !== "all") u.searchParams.set("city", city);
                    if (kind !== "all") u.searchParams.set("type", kind);
                    try {
                      await navigator.clipboard.writeText(u.href);
                      toast.push(
                        "Directory link copied: destination and place type only. Pet details and planning entries are excluded.",
                        "info",
                      );
                    } catch {
                      toast.push(
                        "Copy is unavailable. Use the browser address: it contains destination and type, not planning entries.",
                        "info",
                      );
                    }
                  }}
                >
                  Copy destination & type link
                </button>
                {!disconnected ? (
                  <a
                    className="hospitality-secondary"
                    href="/pet-friendly-directory.csv"
                    download
                  >
                    Download full sourced directory (CSV)
                  </a>
                ) : (
                  <span aria-disabled="true">
                    Reconnect to download the directory
                  </span>
                )}
              </div>
              <p className="pet-small">
                Delhi NCR includes the New Delhi entries plus Gurugram and
                Noida; those cities are also selectable separately. Combined
                results contain each entry once. A species filter requires an
                explicit mention, not a generic pet-friendly tag.
              </p>
              <details className="pet-coverage">
                <summary>
                  Coverage across all {CITIES.length} destinations
                </summary>
                <p>
                  Counts describe this research snapshot, not every venue in a
                  city. NCR counts overlap its subcities. Restaurant coverage
                  gaps: Jamshedpur and Haridwar. No qualifying restaurant
                  entries were established there; that is not proof none exist.
                </p>
                <table>
                  <caption>Sourced directory entries by destination</caption>
                  <thead>
                    <tr>
                      <th>Destination</th>
                      <th>Stays</th>
                      <th>Dining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CITIES.map((c) => (
                      <tr key={c.id}>
                        <th scope="row">{c.name}</th>
                        <td>
                          {
                            filterPetVenues({ city: c.id, kind: "hotel" })
                              .length
                          }
                        </td>
                        <td>
                          {
                            filterPetVenues({ city: c.id, kind: "restaurant" })
                              .length
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
              {city !== "all" && (
                <p>
                  <External href={petMap(city, kind)}>
                    Search beyond this directory in {cityById(city).name}
                  </External>
                  <span className="pet-small">
                    {" "}
                    Opens Google Maps only when chosen. Results are not vetted
                    here and may extend beyond the destination.
                  </span>
                </p>
              )}
              <p role="status" className="pet-result-count">
                {venues.length} matching sourced{" "}
                {venues.length === 1 ? "entry" : "entries"}. Listings do not
                require a deal.
              </p>
              {!venues.length && (
                <div className="hospitality-notice">
                  <h3>No sourced entry matches these filters.</h3>
                  <p>
                    This does not mean no pet-friendly venue exists. Broaden
                    your filters or use the city search and confirm directly.
                  </p>
                  <button className="hospitality-secondary" onClick={reset}>
                    Show all sourced entries
                  </button>
                </div>
              )}
              {CITIES.map((c) => {
                const group = venues.filter((v) => v.city === c.id);
                return group.length ? (
                  <section
                    key={c.id}
                    className="pet-city-group"
                    aria-label={c.name}
                  >
                    <h2>
                      {c.id === "delhi-ncr" ? "New Delhi / Delhi NCR" : c.name}
                    </h2>
                    <div className="pet-grid">
                      {group.map((v) => (
                        <Venue
                          key={v.id}
                          venue={v}
                          today={today}
                          onPlan={(v) => {
                            setSelected(v);
                            document
                              .getElementById("pet-planning")
                              ?.scrollIntoView({ behavior: "auto" });
                          }}
                        />
                      ))}
                    </div>
                  </section>
                ) : null;
              })}
            </section>
            <section
              className="hospitality-section"
              id="pet-offers"
              aria-labelledby="pet-offers-title"
            >
              <span className="hospitality-eyebrow">
                Keep the welcome separate from the saving
              </span>
              <h2 id="pet-offers-title">Pet-friendly offers & coupons</h2>
              <p>
                Offers need a named-venue match, documented pet eligibility and
                a checked date window. A room discount does not mean pet charges
                are waived. Generic travel coupons, unknown validity and expired
                packages are not promoted as pet-friendly deals. This section
                uses the destination selection; other directory filters do not
                apply.
              </p>
              <div className="pet-tools">
                {["hotel", "restaurant"].map((type) => (
                  <div className="pet-offer-panel" key={type}>
                    <h3>
                      {type === "hotel"
                        ? "Pet-friendly hotel offers"
                        : "Pet-friendly dining offers"}
                    </h3>
                    {offers.filter(
                      (o) =>
                        PET_VENUES.find((v) => v.id === o.venueId)?.kind ===
                        type,
                    ).length ? (
                      offers
                        .filter(
                          (o) =>
                            PET_VENUES.find((v) => v.id === o.venueId)?.kind ===
                            type,
                        )
                        .map((o) => (
                          <article key={o.id}>
                            <h4>{o.title}</h4>
                            <p>{o.terms}</p>
                            {o.code && <p>Provider-listed code: {o.code}</p>}
                            <p>
                              Stated window: {o.startsAt} to {o.expiresAt}. Not
                              checkout-tested; availability and pet fees need
                              confirmation.
                            </p>
                            <External href={o.sourceUrl}>
                              Read the provider’s terms
                            </External>
                          </article>
                        ))
                    ) : (
                      <p>
                        {disconnected
                          ? "Reconnect to check offer information."
                          : "No date-checked, venue-matched offers are listed here. That does not mean the venue has no offers. Ask it directly; the directory above remains available without a discount."}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
            <PetPlanning key={city} venue={selected} />
            <section className="hospitality-section">
              <h2>Help keep the welcome accurate.</h2>
              <p>
                Policies, operators and opening status change. Share a venue or
                correction with its exact address and a public policy source;
                submissions require review, not automatic publication. No
                ranking here depends on commission, and these source links are
                not affiliate links.
              </p>
              <Link
                className="hospitality-secondary"
                to="/contact"
                onClick={beforeLeaving}
              >
                Contact us with a suggestion or correction →
              </Link>
              <div className="pet-actions">
                <Link
                  className="hospitality-secondary"
                  onClick={beforeLeaving}
                  to={`/stays${city === "all" ? "" : "?city=" + city}`}
                >
                  Back to Hotels
                </Link>
                <Link
                  className="hospitality-secondary"
                  onClick={beforeLeaving}
                  to={`/dining${city === "all" ? "" : "?city=" + city}`}
                >
                  Back to Dining
                </Link>
              </div>
            </section>
          </div>
        </div>
      </Chrome>
    </>
  );
}
