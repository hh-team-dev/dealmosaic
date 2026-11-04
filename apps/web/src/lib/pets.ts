import records from "../data/pet-venues.json";
import offers from "../data/pet-offers.json";
import {
  CITIES,
  cityById,
  dateValid,
  indiaToday,
  moneyInput,
} from "./hospitality";
export type PetVenue = (typeof records)[number];
export const PET_VENUES = records;
export interface PetOffer {
  id: string;
  venueId: string;
  title: string;
  terms: string;
  sourceUrl: string;
  reviewedAt: string;
  startsAt: string;
  expiresAt: string;
  petEligibilityExplicit: boolean;
  venueMatched: boolean;
  code: string | null;
}
export const PET_OFFERS = offers as PetOffer[];
export function safePetUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}
export function sourceAge(reviewedAt: string, today = indiaToday()): number {
  if (!dateValid(reviewedAt) || !dateValid(today)) return Infinity;
  const age = (Date.parse(today) - Date.parse(reviewedAt)) / 86400000;
  return age < 0 ? Infinity : age;
}
export function petCity(raw: string | null): string {
  raw = (raw || "").trim().toLowerCase();
  if (!raw || raw === "all") return "all";
  const city = cityById(raw);
  return CITIES.some((c) => c.id === raw) ||
    ["mysore", "bhubaneshwar", "vizag", "gurgaon"].includes(raw)
    ? city.id
    : "all";
}
export function cityMatches(venue: PetVenue, city: string): boolean {
  return (
    city === "all" ||
    venue.city === city ||
    (city === "delhi-ncr" && ["gurugram", "noida"].includes(venue.city))
  );
}
export function filterPetVenues({
  city = "all",
  kind = "all",
  species = "all",
  evidence = "all",
  query = "",
} = {}) {
  return PET_VENUES.filter(
    (v) =>
      v.status === "listed" &&
      cityMatches(v, city) &&
      (kind === "all" || v.kind === kind) &&
      (species === "all" || v.species.includes(species)) &&
      (evidence !== "official" ||
        v.sources.some((s) => s.type === "official")) &&
      `${v.name} ${v.area} ${cityById(v.city).name}`
        .toLowerCase()
        .includes(query.trim().slice(0, 100).toLowerCase()),
  );
}
export function petMap(city: string, kind = "all", venue?: PetVenue): string {
  const known = CITIES.find((c) => c.id === city);
  if (!known) throw Error("Select a supported destination");
  const q = venue
    ? `${venue.name}, ${known.query}`
    : `pet friendly ${kind === "hotel" ? "hotels" : kind === "restaurant" ? "restaurants and cafes" : "hotels and restaurants"} in ${city === "delhi-ncr" ? "Delhi NCR, India" : known.query}`;
  if (venue && venue.city !== city) throw Error("Venue geography mismatch");
  const u = new URL("https://www.google.com/maps/search/");
  u.search = new URLSearchParams({ api: "1", query: q }).toString();
  return u.href;
}
export function eligiblePetOffers(
  input: PetOffer[] = PET_OFFERS,
  today = indiaToday(),
): PetOffer[] {
  if (!Array.isArray(input)) return [];
  return input.filter((o) => {
    if (!o || typeof o.title !== "string" || typeof o.terms !== "string") return false;
    const venue = PET_VENUES.find(
      (v) => v.id === o.venueId && v.status === "listed",
    );
    return (
      venue &&
      sourceAge(venue.reviewedAt, today) <= 90 &&
      o.petEligibilityExplicit === true &&
      o.venueMatched === true &&
      safePetUrl(o.sourceUrl) &&
      !!o.title.trim() &&
      !!o.terms.trim() &&
      dateValid(o.startsAt) &&
      dateValid(o.expiresAt) &&
      o.startsAt <= today &&
      o.expiresAt >= today &&
      o.startsAt <= o.expiresAt &&
      sourceAge(o.reviewedAt, today) <= 30
    );
  });
}
export function petCost(
  values: string[],
): { cost: number; deposit: number; upfront: number } | null {
  if (values.length !== 5) return null;
  const amounts = values.map((x) => moneyInput(x));
  if (amounts.some((n) => n === null)) return null;
  const [base, pet, extras, discount, deposit] = amounts as [
    number,
    number,
    number,
    number,
    number,
  ];
  const gross = base + pet + extras;
  if (discount > gross) return null;
  return {
    cost: gross - discount,
    deposit,
    upfront: gross - discount + deposit,
  };
}
export function petMessage(
  venueName: string,
  pet: string,
  count: string,
  weight: string,
): string {
  const species = ["dog", "cat", "other pet"].includes(pet) ? pet : "pet";
  const n = /^[1-9]$/.test(count) ? count : "[number]";
  const kg =
    /^\d{1,3}(\.\d)?$/.test(weight) && Number(weight) > 0
      ? `${weight} kg each`
      : "[weight/size]";
  return `Hello ${venueName.slice(0, 150)}, I would like to visit/stay on [dates] with ${n} ${species}(s), ${kg}. Please confirm in writing: is this species/breed/size permitted on those dates; which room or indoor/outdoor seating can we use; are vaccinations, a carrier or a leash required; what are all pet fees, cleaning charges, taxes and refundable deposits; can the pet be left alone; and what happens if admission is refused? If an offer applies, please confirm its exact inclusions, pet-fee exclusions and final payable total. Thank you.`;
}
