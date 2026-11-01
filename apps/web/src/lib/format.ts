import { formatMoney, money, type CurrencyCode } from '@dealmosaic/core';

/** Rupees from paise — the only place the UI turns integers into text. */
export function inr(amountMinor: number): string {
  return formatMoney(money(amountMinor, 'INR'));
}

export function inrCompact(amountMinor: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export function currencyLabel(code: string): string {
  return code === 'INR' ? 'Indian Rupee (₹)' : code;
}

/** "12 minutes ago" — used for every price freshness stamp. */
export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function currencySymbolFor(displayCurrency: string): string {
  return displayCurrency === 'INR' ? '₹' : displayCurrency;
}

export type { CurrencyCode };
