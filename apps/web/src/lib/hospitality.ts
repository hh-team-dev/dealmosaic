import type { CouponView } from "./coupons-api";

/** Editorial destination directory, NOT a claim of live inventory or outlet coverage. */
export const CITIES = [
  {
    id: "delhi-ncr",
    name: "Delhi NCR",
    query: "New Delhi, India",
    mmt: "delhi",
    note: "Choose New Delhi, Gurugram or Noida for your stay.",
  },
  {
    id: "mumbai",
    name: "Mumbai",
    query: "Mumbai, India",
    mmt: "mumbai",
    note: "Choose the neighbourhood that fits your plans.",
  },
  {
    id: "bengaluru",
    name: "Bengaluru",
    query: "Bengaluru, India",
    mmt: "bangalore",
    note: "A city break or a work trip. Make room for both.",
  },
  {
    id: "chennai",
    name: "Chennai",
    query: "Chennai, India",
    mmt: "chennai",
    note: "Set your dates. Keep the full stay cost in view.",
  },
  {
    id: "hyderabad",
    name: "Hyderabad",
    query: "Hyderabad, India",
    mmt: "hyderabad",
    note: "Find your base, then make the city your own.",
  },
  {
    id: "kolkata",
    name: "Kolkata",
    query: "Kolkata, India",
    mmt: "kolkata",
    note: "Make time for the table as well as the trip.",
  },
  {
    id: "pune",
    name: "Pune",
    query: "Pune, India",
    mmt: "pune",
    note: "A change of scene starts with a considered choice.",
  },
  {
    id: "ahmedabad",
    name: "Ahmedabad",
    query: "Ahmedabad, India",
    mmt: "ahmedabad",
    note: "Your plans first. The small print, made visible.",
  },
  {
    id: "jaipur",
    name: "Jaipur",
    query: "Jaipur, India",
    mmt: "jaipur",
    note: "A memorable escape starts with the right stay.",
  },
] as const;
export type City = (typeof CITIES)[number];
export const cityById = (id: string | null): City =>
  CITIES.find((c) => c.id === id) || CITIES[0];
export type DiningMode = "all" | "dine-in" | "delivery" | "takeaway";
export const DINING_MODES: DiningMode[] = [
  "all",
  "dine-in",
  "delivery",
  "takeaway",
];
export interface FoodBrand {
  id: string;
  name: string;
  kind: "Quick bites" | "Restaurant";
  category: string;
  note: string;
  site: string;
  locator: string;
  order?: string;
  aliases: string[];
}
/** Names are identification, not partnership claims. No copied brand assets/reviews. */
export const FOOD_BRANDS: FoodBrand[] = [
  {
    id: "kfc",
    name: "KFC",
    kind: "Quick bites",
    category: "Chicken & burgers",
    note: "Choose your outlet first. Menus and offers follow your location.",
    site: "https://online.kfc.co.in/",
    locator: "https://restaurants.kfc.co.in/",
    order: "https://online.kfc.co.in/",
    aliases: ["kfc"],
  },
  {
    id: "mcdonalds",
    name: "McDonald’s",
    kind: "Quick bites",
    category: "Burgers & café",
    note: "North & East and West & South use different regional services.",
    site: "https://www.mcdonaldsindia.com/",
    locator: "https://www.mcdonaldsindia.com/",
    order: "https://www.mcdonaldsindia.com/",
    aliases: ["mcdonalds", "mcdonald-s", "mcdonalds-india"],
  },
  {
    id: "dominos",
    name: "Domino’s",
    kind: "Quick bites",
    category: "Pizza & sides",
    note: "Pick your address or store before comparing the final order total.",
    site: "https://www.dominos.co.in/",
    locator: "https://www.dominos.co.in/store-location",
    order: "https://www.dominos.co.in/",
    aliases: ["dominos", "dominos-pizza", "dominos-india"],
  },
  {
    id: "pizza-hut",
    name: "Pizza Hut",
    kind: "Quick bites",
    category: "Pizza & sides",
    note: "Delivery and collection have their own menus and conditions.",
    site: "https://www.pizzahut.co.in/",
    locator: "https://restaurants.pizzahut.co.in/",
    order: "https://www.pizzahut.co.in/",
    aliases: ["pizza-hut", "pizzahut"],
  },
  {
    id: "wow-momo",
    name: "Wow! Momo",
    kind: "Quick bites",
    category: "Momos & more",
    note: "Use the official locator to choose a branch, then check its menu.",
    site: "https://www.wowmomo.com/",
    locator: "https://restaurants.wowmomo.com/",
    aliases: ["wow-momo", "wowmomo"],
  },
  {
    id: "mainland-china",
    name: "Mainland China",
    kind: "Restaurant",
    category: "Chinese dining",
    note: "Check the selected restaurant’s menu, table availability and offer terms.",
    site: "https://www.speciality.co.in/",
    locator: "https://www.speciality.co.in/",
    aliases: ["mainland-china"],
  },
  {
    id: "chinese-wok",
    name: "Chinese Wok",
    kind: "Quick bites",
    category: "Desi Chinese",
    note: "Find a store or choose an ordering service on the official site.",
    site: "https://www.thechinesewok.com/",
    locator: "https://www.thechinesewok.com/locate",
    order: "https://www.thechinesewok.com/order-now",
    aliases: ["chinese-wok", "the-chinese-wok"],
  },
  {
    id: "taco-bell",
    name: "Taco Bell",
    kind: "Quick bites",
    category: "Tacos & burritos",
    note: "Choose an outlet on the official India site. Availability varies.",
    site: "https://www.tacobell.co.in/",
    locator: "https://www.tacobell.co.in/",
    order: "https://www.tacobell.co.in/",
    aliases: ["taco-bell", "tacobell"],
  },
  {
    id: "barbeque-nation",
    name: "Barbeque Nation",
    kind: "Restaurant",
    category: "Grill & buffet",
    note: "Confirm the selected restaurant, sitting and current buffet terms.",
    site: "https://www.barbequenation.com/",
    locator: "https://www.barbequenation.com/",
    aliases: ["barbeque-nation"],
  },
];

export function indiaToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function dateValid(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value
  );
}
export function nightsBetween(from: string, to: string): number {
  return dateValid(from) && dateValid(to)
    ? Math.round((Date.parse(to) - Date.parse(from)) / 86400000)
    : 0;
}
export interface StayPlan {
  city: string;
  area: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  ages: string[];
}
export function validateStay(
  plan: StayPlan,
  today = indiaToday(),
): string | null {
  if (!CITIES.some((c) => c.id === plan.city))
    return "Choose one of our nine city regions.";
  if (!dateValid(plan.checkin) || !dateValid(plan.checkout))
    return "Choose valid arrival and departure dates.";
  if (plan.checkin < today) return "Arrival cannot be in the past.";
  const nights = nightsBetween(plan.checkin, plan.checkout);
  if (nights < 1 || nights > 30)
    return "Choose a stay between 1 and 30 nights.";
  if (
    !Number.isInteger(plan.adults) ||
    plan.adults < 1 ||
    plan.adults > 8 ||
    !Number.isInteger(plan.rooms) ||
    plan.rooms < 1 ||
    plan.rooms > 4
  )
    return "Choose 1–8 adults and 1–4 rooms.";
  if (
    plan.ages.length > 4 ||
    plan.ages.some((a) => !/^\d{1,2}$/.test(a) || Number(a) > 17)
  )
    return "Choose the age of each child, from 0 to 17.";
  if (
    plan.city === "delhi-ncr" &&
    !["New Delhi", "Gurugram", "Noida"].includes(plan.area)
  )
    return "Choose your Delhi NCR destination.";
  return null;
}
export function bookingSearch(plan: StayPlan, today = indiaToday()): string {
  const error = validateStay(plan, today);
  if (error) throw new Error(error);
  const url = new URL("https://www.booking.com/searchresults.html");
  url.search = new URLSearchParams({
    ss:
      plan.city === "delhi-ncr"
        ? `${plan.area}, India`
        : cityById(plan.city).query,
    checkin: plan.checkin,
    checkout: plan.checkout,
    group_adults: String(plan.adults),
    no_rooms: String(plan.rooms),
    group_children: String(plan.ages.length),
    selected_currency: "INR",
  }).toString();
  plan.ages.forEach((age) => url.searchParams.append("age", age));
  return url.href;
}
export function hotelDirectory(city: City): string {
  return `https://www.makemytrip.com/hotels/${city.mmt}-hotels.html`;
}
export function moneyInput(raw: string, optional = false): number | null {
  if (raw.trim() === "") return optional ? 0 : null;
  if (!/^\d+(\.\d{1,2})?$/.test(raw.trim())) return null;
  const value = Math.round(Number(raw) * 100);
  return Number.isSafeInteger(value) && value <= 100000000 ? value : null;
}
export function diningTotal(input: {
  eligible: string;
  excluded: string;
  fees: string;
  percent: string;
  cap: string;
  minimum: string;
}): { saving: number; total: number; belowMinimum: boolean } | null {
  const eligible = moneyInput(input.eligible),
    excluded = moneyInput(input.excluded, true),
    fees = moneyInput(input.fees, true),
    cap = moneyInput(input.cap),
    minimum = moneyInput(input.minimum, true);
  if (
    eligible === null ||
    eligible === 0 ||
    excluded === null ||
    fees === null ||
    minimum === null ||
    !/^(\d{1,3})(\.\d{1,2})?$/.test(input.percent) ||
    Number(input.percent) > 100 ||
    (input.cap.trim() !== "" && cap === null)
  )
    return null;
  const belowMinimum = eligible < minimum;
  const saving = belowMinimum
    ? 0
    : Math.min(
        Math.round((eligible * Number(input.percent)) / 100),
        input.cap.trim() === "" ? eligible : cap!,
        eligible,
      );
  return { saving, total: eligible + excluded + fees - saving, belowMinimum };
}
export const rupees = (minor: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(minor / 100);
const HOTEL_SOURCES = new Set(["cleartrip-hotels", "itc-hotels"]);
export function hospitalityCoupon(
  c: CouponView,
  kind: "stays" | "dining",
  brand?: FoodBrand,
  now = Date.now(),
): boolean {
  if (
    !c.id ||
    !c.title ||
    !c.outboundUrl ||
    !["listed", "community_verified", "moderator_verified"].includes(
      c.trustState,
    )
  )
    return false;
  // Require a stated, valid future expiry. Unknown validity is not a current offer.
  if (
    !c.expiresAt ||
    !Number.isFinite(Date.parse(c.expiresAt)) ||
    Date.parse(c.expiresAt) <= now
  )
    return false;
  if (
    c.startsAt &&
    (!Number.isFinite(Date.parse(c.startsAt)) || Date.parse(c.startsAt) > now)
  )
    return false;
  if (kind === "stays") return HOTEL_SOURCES.has(c.platformSlug);
  return Boolean(brand?.aliases.includes(c.platformSlug));
}
