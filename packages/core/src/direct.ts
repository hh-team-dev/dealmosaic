/** Own-stock commerce contracts. Amounts are integer paise, never floats. */
export interface DirectVariant {
  id: string;
  label: string;
  available: number;
  mode: "ready" | "made";
  leadDays: number;
}
export interface DirectProduct {
  id: string;
  version: number;
  title: string;
  description: string;
  category: string;
  materials: string;
  care: string;
  measurements: string;
  maker: "sourced" | "self";
  status: "draft" | "published" | "archived";
  referenceType: "none" | "mrp" | "previous";
  referenceMinor: number;
  priceMinor: number;
  floorMinor: number;
  referenceEvidence: string;
  scope: "hold" | "west_bengal" | "india";
  eligibilityBasis: string;
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  media: Array<{ id: string; kind: "image" | "video"; alt: string }>;
  variants: DirectVariant[];
  couponCode: string;
  couponOffMinor: number;
  couponEndsAt: string;
}
export interface ShopSettings {
  enabled: boolean;
  sellerName: string;
  sellerAddress: string;
  supportEmail: string;
  supportPhone: string;
  grievanceName: string;
  originPin: string;
  originState: "West Bengal";
  upiId: string;
  payeeName: string;
  returnsPolicy: string;
  shippingPolicy: string;
  eligibilityBasis: string;
}
export interface DeliveryRate {
  id: string;
  productId: string;
  parcelKey: string;
  originPin: string;
  destinationPin: string;
  destinationState: string;
  provider: string;
  service: string;
  serviceable: boolean;
  totalMinor: number;
  transitDays: number;
  pickupWaitDays: number;
  expiresAt: string;
  evidence: string;
  verifiedAt: string;
}
export const EMPTY_SHOP: ShopSettings = {
  enabled: false,
  sellerName: "",
  sellerAddress: "",
  supportEmail: "",
  supportPhone: "",
  grievanceName: "",
  originPin: "",
  originState: "West Bengal",
  upiId: "",
  payeeName: "",
  returnsPolicy: "",
  shippingPolicy: "",
  eligibilityBasis: "",
};
export function discountFacts(reference: number, price: number) {
  if (
    !Number.isSafeInteger(reference) ||
    !Number.isSafeInteger(price) ||
    price < 0 ||
    reference <= price
  )
    return null;
  const savingMinor = reference - price;
  return { savingMinor, percent: Math.floor((savingMinor * 100) / reference) };
}
export function parcelKey(
  p: Pick<DirectProduct, "weightGrams" | "lengthCm" | "widthCm" | "heightCm">,
) {
  return `${p.weightGrams}/${p.lengthCm}/${p.widthCm}/${p.heightCm}/qty1`;
}
export function cheapestDelivery(
  rates: DeliveryRate[],
  p: DirectProduct,
  origin: string,
  destination: string,
  now = Date.now(),
) {
  const matching = rates.filter(
    (r) =>
      r.productId === p.id &&
      r.parcelKey === parcelKey(p) &&
      r.originPin === origin &&
      r.destinationPin === destination &&
      Number.isFinite(Date.parse(r.expiresAt)) &&
      Date.parse(r.expiresAt) > now,
  );
  const eligible = matching.filter(
    (r) =>
      r.serviceable &&
      Number.isSafeInteger(r.totalMinor) &&
      r.totalMinor >= 0 &&
      (p.scope === "india" ||
        (p.scope === "west_bengal" && r.destinationState === "West Bengal")),
  );
  eligible.sort(
    (a, b) =>
      a.totalMinor - b.totalMinor ||
      a.transitDays + a.pickupWaitDays - (b.transitDays + b.pickupWaitDays) ||
      a.id.localeCompare(b.id),
  );
  return {
    selected: eligible[0] ?? null,
    compared: eligible.length,
    status: eligible.length
      ? ("available" as const)
      : !matching.length
        ? ("unknown" as const)
        : matching.every((r) => !r.serviceable)
          ? ("unserviceable" as const)
          : ("restricted" as const),
  };
}
export function sellingTotal(
  p: DirectProduct,
  code: string,
  shippingMinor: number,
  now = Date.now(),
) {
  let discountMinor = 0;
  if (code.trim()) {
    if (
      !p.couponCode ||
      code.trim().toUpperCase() !== p.couponCode ||
      !p.couponEndsAt ||
      Date.parse(p.couponEndsAt) <= now ||
      !Number.isFinite(Date.parse(p.couponEndsAt))
    )
      throw new Error("This code is not available.");
    discountMinor = p.couponOffMinor;
  }
  const itemMinor = p.priceMinor - discountMinor;
  if (itemMinor < p.floorMinor || itemMinor <= 0)
    throw new Error("This offer would go below the minimum selling price.");
  if (!Number.isSafeInteger(shippingMinor) || shippingMinor < 0)
    throw new Error("Shipping has not been confirmed.");
  return {
    itemMinor,
    discountMinor,
    shippingMinor,
    totalMinor: itemMinor + shippingMinor,
  };
}
