import type {
  DeliveryRate,
  DirectProduct,
  ShopSettings,
} from "@dealmosaic/core";
import { apiRequest, getCsrfToken } from "./api";
export type PublicDirectProduct = Omit<
  DirectProduct,
  | "floorMinor"
  | "referenceEvidence"
  | "eligibilityBasis"
  | "couponCode"
  | "couponOffMinor"
  | "couponEndsAt"
> & { discount: { savingMinor: number; percent: number } | null };
export interface Seller {
  name: string;
  address: string;
  email: string;
  phone: string;
  grievanceName: string;
  returnsPolicy: string;
  shippingPolicy: string;
}
export interface DirectTotals {
  itemMinor: number;
  discountMinor: number;
  shippingMinor: number;
  totalMinor: number;
}
export interface DirectQuote {
  id: string;
  productId: string;
  variantId: string;
  destinationPin: string;
  rate: Omit<DeliveryRate, "evidence">;
  compared: number;
  expiresAt: string;
  totals: DirectTotals;
  deliveryDays: number;
}
export interface DirectOrderView {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  option: string;
  buyer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  totals: DirectTotals;
  rate: DeliveryRate;
  deliveryDays: number;
  status: string;
  createdAt: string;
  reservationUntil: string;
  customerReference: string;
  tracking: string;
  seller: ShopSettings;
  note: string;
}
export interface ShopOverview {
  settings: ShopSettings;
  settingsVersion: number;
  products: DirectProduct[];
  rates: DeliveryRate[];
  orders: DirectOrderView[];
  media: Array<{ id: string; mime: string; size: number }>;
  events: Array<{ id: string; action: string; at: string; entity_id: string }>;
  deliveryChecks: Array<{
    product_id: string;
    destination_pin: string;
    checks: number;
    last_checked: string;
  }>;
  carrierApiConnected: boolean;
  deliveryMode: string;
}
export const getShopOverview = () =>
  apiRequest<ShopOverview>("/api/direct-admin/overview");
export const getDirectProducts = (signal?: AbortSignal) =>
  apiRequest<{ products: PublicDirectProduct[]; seller: Seller | null }>(
    "/api/direct/products",
    { signal },
  );
export async function uploadDirectMedia(file: File) {
  const token = getCsrfToken();
  const res = await fetch("/api/direct-admin/media", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "content-type": file.type,
      ...(token ? { "x-csrf-token": token } : {}),
    },
    body: file,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Upload failed.");
  return data as { id: string; kind: "image" | "video"; size: number };
}
export function newOrderToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
}
export const rupees = (minor: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(minor / 100);
export function orderLabel(status: string) {
  return (
    (
      {
        awaiting_payment: "Awaiting payment",
        payment_review: "Payment awaiting verification",
        paid: "Payment verified",
        dispatched: "Dispatched",
        delivered: "Delivered",
        cancelled: "Cancelled",
        refunded: "Refund recorded",
        expired: "Payment window ended",
        refund_required: "Late payment received · refund required",
      } as Record<string, string>
    )[status] ?? status
  );
}
