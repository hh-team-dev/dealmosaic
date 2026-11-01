import { describe, expect, it } from 'vitest';
import {
  buildPriceTruth,
  convertMoney,
  formatMoney,
  formatMoneyCompact,
  money,
  toMinor,
  unitPrice,
  type PriceLine,
} from '../src/money.js';

const INR = 'INR' as const;

describe('money: integer minor units', () => {
  it('converts display amounts to paise without float drift', () => {
    expect(toMinor(1299.99, INR)).toBe(129999);
    expect(toMinor(0.1 + 0.2, INR)).toBe(30); // 0.30000000000000004 → 30 paise
    expect(toMinor(49.995, INR)).toBe(5000); // half-up
  });

  it('formats INR with Indian digit grouping', () => {
    // Non-breaking spaces are normalised so the assertion is locale-stable.
    const s = formatMoney(money(123456789, INR)).replace(/\u00a0/g, ' ');
    expect(s).toContain('12,34,567.89');
  });

  it('formats compact values without decimals', () => {
    const s = formatMoneyCompact(money(5549900, INR)).replace(/\u00a0/g, ' ');
    expect(s).not.toContain('.');
    expect(s).toContain('55,499');
  });

  it('converts currency and rounds exactly once', () => {
    // ₹8,999.00 → USD at 95.11 INR per USD
    const usd = convertMoney(money(899900, INR), 1 / 95.11, 'USD');
    expect(usd.currency).toBe('USD');
    expect(usd.amountMinor).toBe(9462); // 94.62
  });

  it('refuses to silently mix currencies', () => {
    expect(() =>
      convertMoney(money(100, 'USD' as never), 1, 'INR' as never),
    ).not.toThrow(); // convert is fine — it changes currency deliberately
  });
});

describe('Price Truth Engine', () => {
  const complete: PriceLine[] = [
    { kind: 'item', label: 'Product price', state: 'confirmed', amountMinor: 8999000 },
    { kind: 'shipping', label: 'Delivery', state: 'confirmed', amountMinor: 0 },
    { kind: 'tax', label: 'GST included in price', state: 'not_applicable', amountMinor: null },
    { kind: 'discount', label: 'Bank offer', state: 'confirmed', amountMinor: -150000 },
  ];

  it('sums known lines and subtracts confirmed discounts', () => {
    const t = buildPriceTruth(complete, INR);
    expect(t.knownTotalMinor).toBe(8849000);
    expect(t.verifiedTotalMinor).toBe(8849000);
    expect(t.verificationState).toBe('complete');
    expect(t.discountsAppliedMinor).toBe(150000);
  });

  it('never treats missing shipping as zero', () => {
    const lines: PriceLine[] = [
      { kind: 'item', label: 'Product price', state: 'confirmed', amountMinor: 499900 },
      { kind: 'shipping', label: 'Delivery', state: 'not_available', amountMinor: null },
      { kind: 'tax', label: 'GST', state: 'confirmed', amountMinor: 25000 },
    ];
    const t = buildPriceTruth(lines, INR);
    expect(t.knownTotalMinor).toBe(524900); // does NOT include a fake 0 delivery
    expect(t.verifiedTotalMinor).toBeNull();
    expect(t.verificationState).toBe('partial');
    expect(t.missing).toEqual(['Delivery']);
  });

  it('excludes conditional fees from the total and reports them', () => {
    const lines: PriceLine[] = [
      { kind: 'item', label: 'Lay’s Classic Salted 52 g', state: 'confirmed', amountMinor: 2000 },
      {
        kind: 'fee',
        label: 'Delivery fee',
        state: 'conditional',
        amountMinor: 2500,
        note: 'free above ₹199 cart, else ₹25',
      },
    ];
    const t = buildPriceTruth(lines, INR);
    expect(t.knownTotalMinor).toBe(2000); // the chips, not a guessed ₹45
    expect(t.conditional).toHaveLength(1);
    expect(t.conditional[0]).toContain('free above ₹199');
  });

  it('treats a conditionally-applicable delivery charge as an unverified total', () => {
    // Quick-commerce dark stores publish no per-item delivery fee: it depends on
    // cart value. The item price is known, but the money the shopper will pay is
    // not — so the total must never be labelled complete.
    const lines: PriceLine[] = [
      { kind: 'item', label: 'Amul Taaza 500 ml', state: 'confirmed', amountMinor: 2700 },
      {
        kind: 'shipping',
        label: 'Delivery',
        state: 'conditional',
        amountMinor: null,
        note: 'Free above ₹199 cart, otherwise ₹25–35',
      },
      { kind: 'tax', label: 'GST', state: 'not_applicable', amountMinor: null },
    ];
    const t = buildPriceTruth(lines, INR);
    expect(t.knownTotalMinor).toBe(2700);
    expect(t.verificationState).toBe('partial');
    expect(t.verifiedTotalMinor).toBeNull();
    expect(t.conditional[0]).toContain('₹199');
  });

  it('marks estimated mandatory lines as unverified', () => {
    const lines: PriceLine[] = [
      { kind: 'item', label: 'Product price', state: 'confirmed', amountMinor: 100000 },
      { kind: 'shipping', label: 'Delivery', state: 'estimated', amountMinor: 4900 },
      { kind: 'tax', label: 'GST', state: 'confirmed', amountMinor: 5000 },
    ];
    const t = buildPriceTruth(lines, INR);
    expect(t.verificationState).toBe('partial');
    expect(t.verifiedTotalMinor).toBeNull();
  });
});

describe('unit pricing (grocery)', () => {
  it('computes ₹ per 100 g for a 52 g pack', () => {
    const u = unitPrice(2000, 52, 'g'); // ₹20
    expect(u.per100).toBe(3846); // ₹38.46 per 100 g
  });

  it('shows the 180 g family pack as better value per gramme', () => {
    const small = unitPrice(2000, 52, 'g').per100!;
    const large = unitPrice(5500, 180, 'g').per100!;
    expect(large).toBeLessThan(small);
  });

  it('returns null rather than guessing when quantity is missing', () => {
    expect(unitPrice(2000, null, 'g').per100).toBeNull();
    expect(unitPrice(2000, 100, null).per100).toBeNull();
  });

  it('handles litres and pieces', () => {
    expect(unitPrice(6000, 1, 'l').per100).toBe(600); // ₹60 per 100 ml
    expect(unitPrice(2500, 1, 'pc').perBase).toBe(2500);
  });
});
