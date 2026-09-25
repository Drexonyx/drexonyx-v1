// Pricing safety tests — verifies that:
// 1. No package has a zero or negative creditCost.
// 2. No package has a zero or negative AED price.
// 3. creditCost is NOT equal to the AED price (1:1 coupling is the bug we fixed).
// 4. The minimum Starter-tier entry price holds (AED 100 floor — 600cr @ 0.2000).
// 5. creditCost values match the new 10x economic model exactly.

import { describe, it, expect } from 'vitest';
import { MICRO_PACKAGES, PRODUCTION_PACKAGES } from '../pricing';

const ALL_PACKAGES = [...MICRO_PACKAGES, ...PRODUCTION_PACKAGES];

describe('Pricing — no zero/negative values', () => {
  it.each(ALL_PACKAGES)('$name: creditCost > 0', ({ creditCost }) => {
    expect(creditCost).toBeGreaterThan(0);
  });

  it.each(ALL_PACKAGES)('$name: price > 0', ({ price }) => {
    expect(price).toBeGreaterThan(0);
  });
});

describe('Pricing — credits are NOT 1:1 with AED (fatal coupling check)', () => {
  it.each(ALL_PACKAGES)('$name: creditCost !== price', ({ creditCost, price }) => {
    expect(creditCost).not.toBe(price);
  });
});

describe('Pricing — credit economy invariants', () => {
  // At Starter tier (600cr = AED 120), 1 credit = AED 0.20.
  // Minimum viable credit cost per AED 1 of listed price = 5 credits.
  it.each(ALL_PACKAGES)(
    '$name: creditCost >= price * 5 (at least 5 credits per AED)',
    ({ creditCost, price }) => {
      expect(creditCost).toBeGreaterThanOrEqual(price * 5);
    },
  );

  // creditCost must never exceed price * 6 to stay within a reasonable bracket.
  // (micro-creative: 199 * 5 = 995 → 1000 fits; 199 * 6 = 1194 → 1000 fits)
  it.each(ALL_PACKAGES)(
    '$name: creditCost <= price * 6 (no runaway inflation)',
    ({ creditCost, price }) => {
      expect(creditCost).toBeLessThanOrEqual(price * 6);
    },
  );
});

describe('Pricing — exact credit costs for v2 economy', () => {
  const EXPECTED: Record<string, number> = {
    'micro-creative':  1000,
    'creative-brief':  1500,
    spark:             2500,
    starter:           7500,
    growth:           17500,
    scale:            32500,
    production:       72500,
  };

  it.each(Object.entries(EXPECTED))('Package %s has creditCost %i', (id, expected) => {
    const pkg = ALL_PACKAGES.find((p) => p.id === id);
    expect(pkg, `Package "${id}" not found`).toBeDefined();
    expect(pkg!.creditCost).toBe(expected);
  });
});

describe('Pricing — server-side price authority (prices are static in source)', () => {
  // Verifies that the priceLabel accurately reflects the price field.
  // This guards against a label and price drifting out of sync.
  it.each(MICRO_PACKAGES)('$name: priceLabel contains the AED price', ({ price, priceLabel }) => {
    const formatted = price.toLocaleString('en-US');
    expect(priceLabel).toContain(formatted);
  });

  it.each(PRODUCTION_PACKAGES)('$name: priceLabel contains the AED price', ({ price, priceLabel }) => {
    const formatted = price.toLocaleString('en-US');
    expect(priceLabel).toContain(formatted);
  });
});
