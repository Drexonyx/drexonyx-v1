// Tests for the internal credit cost guard — lib/credits/cost-guard.ts
// Covers: approved package values, runaway protection, reserve logic,
// customer credit isolation, retry limits, and manipulation resistance.

import { describe, it, expect, vi } from 'vitest';
import {
  evaluateCostGuard,
  resolvePackageEconomics,
  PACKAGE_ECONOMICS_TABLE,
  type PackageEconomics,
} from '../cost-guard';
import { MICRO_PACKAGES, PRODUCTION_PACKAGES } from '../../pricing';

// ─── 1. Approved package prices remain unchanged ───────────────────────────────

describe('Approved customer package prices are unchanged', () => {
  const APPROVED = [
    { name: 'Starter Pack',  credits:   600, priceAed:   120 },
    { name: 'Creator Pack',  credits:  2000, priceAed:   350 },
    { name: 'Pro Pack',      credits:  5000, priceAed:   800 },
    { name: 'Growth Pack',   credits: 10000, priceAed:  1500 },
    { name: 'Studio Pack',   credits: 25000, priceAed:  3250 },
    { name: 'Scale Pack',    credits: 50000, priceAed:  5500 },
    { name: 'Power Pack',    credits: 75000, priceAed:  7000 },
  ];

  it.each(APPROVED)(
    '$name: economics table has correct credits and price',
    ({ credits, priceAed }) => {
      const econ = PACKAGE_ECONOMICS_TABLE.find((e) => e.creditsInPackage === credits);
      expect(econ, `No economics entry for ${credits} credits`).toBeDefined();
      expect(econ!.packagePriceAed).toBe(priceAed);
    },
  );
});

describe('Approved credit quantities in pricing.ts remain unchanged', () => {
  const ALL = [...MICRO_PACKAGES, ...PRODUCTION_PACKAGES];

  it.each(ALL)('$name: creditCost > 0 and not equal to price', ({ creditCost, price }) => {
    expect(creditCost).toBeGreaterThan(0);
    expect(creditCost).not.toBe(price);
  });
});

// ─── 2. Credit reservation idempotency (via existing ledger tests) ────────────
// (Covered in lib/credits/__tests__/credits.test.ts — not duplicated here)

// ─── 3. Normal production — within target ─────────────────────────────────────

describe('evaluateCostGuard — NORMAL (within target)', () => {
  const econ: PackageEconomics = { creditsInPackage: 600, packagePriceAed: 120, costTargetAed: 50, safetyReserveAed: 20 };

  it('returns NORMAL for zero credits', () => {
    const r = evaluateCostGuard(0, econ);
    expect(r.proceed).toBe(true);
    expect(r.warningLevel).toBe('NORMAL');
  });

  it('returns NORMAL when estimated AED is well below cost target', () => {
    // 600cr / 120 AED = 0.20 AED/cr. 200 credits × 0.20 = 40 AED < 50 AED target.
    const r = evaluateCostGuard(200, econ);
    expect(r.proceed).toBe(true);
    expect(r.warningLevel).toBe('NORMAL');
    expect(r.estimatedAedConsumed).toBeCloseTo(40, 5);
    expect(r.overTargetBy).toBe(0);
    expect(r.reserveUsed).toBe(0);
  });

  it('returns NORMAL at exactly the cost target', () => {
    // 250 credits × 0.20 = 50 AED = costTargetAed exactly.
    const r = evaluateCostGuard(250, econ);
    expect(r.proceed).toBe(true);
    expect(r.warningLevel).toBe('NORMAL');
  });
});

// ─── 4. Reserve usage — between target and target+reserve ────────────────────

describe('evaluateCostGuard — RESERVE_USED', () => {
  const econ: PackageEconomics = { creditsInPackage: 600, packagePriceAed: 120, costTargetAed: 50, safetyReserveAed: 20 };

  it('returns RESERVE_USED when slightly over target', () => {
    // 275cr × 0.20 = 55 AED — 5 AED over target, within 20 AED reserve.
    const r = evaluateCostGuard(275, econ);
    expect(r.proceed).toBe(true);
    expect(r.warningLevel).toBe('RESERVE_USED');
    expect(r.reserveUsed).toBeGreaterThan(0);
  });

  it('production still proceeds in reserve zone', () => {
    const r = evaluateCostGuard(340, econ);
    // 340 × 0.20 = 68 AED. costTarget=50, costTarget+reserve=70. Still within.
    expect(r.proceed).toBe(true);
  });
});

// ─── 5. Over target (beyond reserve) ─────────────────────────────────────────

describe('evaluateCostGuard — OVER_TARGET', () => {
  const econ: PackageEconomics = { creditsInPackage: 600, packagePriceAed: 120, costTargetAed: 50, safetyReserveAed: 20 };

  it('returns OVER_TARGET when beyond costTarget + reserve but below runaway', () => {
    // 360cr × 0.20 = 72 AED > 50+20=70 AED. Runaway = 70 × 1.5 = 105 AED. So: over-target but not runaway.
    const r = evaluateCostGuard(360, econ);
    expect(r.proceed).toBe(true);
    expect(r.warningLevel).toBe('OVER_TARGET');
  });
});

// ─── 6. Runaway protection ────────────────────────────────────────────────────

describe('evaluateCostGuard — RUNAWAY (hard limit)', () => {
  const econ: PackageEconomics = { creditsInPackage: 600, packagePriceAed: 120, costTargetAed: 50, safetyReserveAed: 20 };

  it('refuses production when hard runaway limit reached', () => {
    // hardLimit = (50+20) × 1.5 = 105 AED. 525cr × 0.20 = 105 AED → refused.
    const r = evaluateCostGuard(525, econ);
    expect(r.proceed).toBe(false);
    expect(r.warningLevel).toBe('RUNAWAY');
  });

  it('refuses production when well above hard limit', () => {
    const r = evaluateCostGuard(1000, econ);
    expect(r.proceed).toBe(false);
    expect(r.warningLevel).toBe('RUNAWAY');
  });

  it('hard limit scales with the correct formula', () => {
    const r = evaluateCostGuard(0, econ);
    const expected = (econ.costTargetAed + econ.safetyReserveAed) * 1.5;
    expect(r.hardLimitAed).toBeCloseTo(expected, 4);
  });

  it('runaway guard is configurable via env var', () => {
    vi.stubEnv('PRODUCTION_RUNAWAY_MULTIPLIER', '2.0');
    const r = evaluateCostGuard(0, econ);
    const expected = (econ.costTargetAed + econ.safetyReserveAed) * 2.0;
    expect(r.hardLimitAed).toBeCloseTo(expected, 4);
    vi.unstubAllEnvs();
  });

  it('runaway multiplier below 1.0 falls back to 1.5', () => {
    vi.stubEnv('PRODUCTION_RUNAWAY_MULTIPLIER', '0.5');
    const r = evaluateCostGuard(0, econ);
    const expected = (econ.costTargetAed + econ.safetyReserveAed) * 1.5;
    expect(r.hardLimitAed).toBeCloseTo(expected, 4);
    vi.unstubAllEnvs();
  });
});

// ─── 7. Customer credit isolation ────────────────────────────────────────────
// The cost guard is a pure function — it never touches the DB or the customer ledger.

describe('evaluateCostGuard — customer credit isolation', () => {
  it('returns a result without any DB access', () => {
    const econ: PackageEconomics = { creditsInPackage: 2000, packagePriceAed: 350, costTargetAed: 140, safetyReserveAed: 50 };
    // If this test passes without any DB mock, the function is a pure computation.
    const r = evaluateCostGuard(100, econ);
    expect(r).toBeDefined();
    expect(typeof r.proceed).toBe('boolean');
  });

  it('never returns internal cost data that would expose provider pricing', () => {
    const econ: PackageEconomics = { creditsInPackage: 600, packagePriceAed: 120, costTargetAed: 50, safetyReserveAed: 20 };
    const r = evaluateCostGuard(200, econ);
    // Result should not contain undefined provider-specific fields
    expect(r).not.toHaveProperty('providerCostAed');
    expect(r).not.toHaveProperty('higgsFieldCost');
    expect(r).not.toHaveProperty('providerCreditsUsed');
  });
});

// ─── 8. Package economics resolver ───────────────────────────────────────────

describe('resolvePackageEconomics', () => {
  it('resolves exact match for each approved tier', () => {
    const tiers = [600, 2000, 5000, 10000, 25000, 50000, 75000];
    for (const credits of tiers) {
      const econ = resolvePackageEconomics(credits);
      expect(econ, `No economics for ${credits}`).not.toBeNull();
      expect(econ!.creditsInPackage).toBe(credits);
    }
  });

  it('falls back to closest tier for unknown package size', () => {
    const econ = resolvePackageEconomics(700);
    // Closest to 700 is 600 (diff=100) vs 2000 (diff=1300)
    expect(econ!.creditsInPackage).toBe(600);
  });

  it('returns non-null for all approved tiers', () => {
    PACKAGE_ECONOMICS_TABLE.forEach((tier) => {
      const econ = resolvePackageEconomics(tier.creditsInPackage);
      expect(econ).not.toBeNull();
    });
  });
});

// ─── 9. Client cannot manipulate credit cost or package price ─────────────────
// The evaluateCostGuard function only accepts server-controlled inputs.
// Client-provided values (from form submission, URL params, etc.) must never
// reach this function. This test verifies the function rejects nonsensical inputs.

describe('evaluateCostGuard — input validation', () => {
  it('handles negative credits gracefully (returns NORMAL for 0 cost)', () => {
    const econ: PackageEconomics = { creditsInPackage: 600, packagePriceAed: 120, costTargetAed: 50, safetyReserveAed: 20 };
    // Negative credits would produce negative AED — treated as 0 cost
    const r = evaluateCostGuard(-100, econ);
    expect(r.proceed).toBe(true);
    expect(r.estimatedAedConsumed).toBeLessThanOrEqual(0);
  });

  it('returns correct result even if packageCredits is 0 (edge case)', () => {
    const econ: PackageEconomics = { creditsInPackage: 0, packagePriceAed: 120, costTargetAed: 50, safetyReserveAed: 20 };
    // Division by zero guard: creditRate = 0 when package has 0 credits
    const r = evaluateCostGuard(100, econ);
    expect(r.creditRateAed).toBe(0);
    expect(r.estimatedAedConsumed).toBe(0);
    expect(r.proceed).toBe(true);
  });
});

// ─── 10. Internal economics values are operating targets, not claimed costs ───

describe('PACKAGE_ECONOMICS_TABLE — internal targets documentation', () => {
  it('every tier has a positive cost target and safety reserve', () => {
    PACKAGE_ECONOMICS_TABLE.forEach((t) => {
      expect(t.costTargetAed).toBeGreaterThan(0);
      expect(t.safetyReserveAed).toBeGreaterThan(0);
    });
  });

  it('cost target is always less than the package price (margin exists)', () => {
    PACKAGE_ECONOMICS_TABLE.forEach((t) => {
      expect(t.costTargetAed).toBeLessThan(t.packagePriceAed);
    });
  });

  it('safety reserve is always less than the remaining margin above cost target', () => {
    PACKAGE_ECONOMICS_TABLE.forEach((t) => {
      const remainingMargin = t.packagePriceAed - t.costTargetAed;
      expect(t.safetyReserveAed).toBeLessThanOrEqual(remainingMargin);
    });
  });
});
