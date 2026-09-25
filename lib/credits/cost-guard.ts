// Internal credit economy cost guard — DR 0120.
//
// This is INTERNAL ONLY. Nothing here is customer-facing.
// The customer sees only: credit balance, credit cost per service.
// The cost guard protects against runaway generation loops and
// tracks reserve usage for internal economic reporting.
//
// Terminology:
//   creditCost          — credits charged to the customer for the service
//   creditRate          — AED per credit at the customer's package tier (derived)
//   costTargetAed       — INTERNAL target cost (AED) for this production (from PACKAGE_ECONOMICS)
//   safetyReserveAed    — INTERNAL reserve buffer above costTargetAed
//   runawayLimitCredits — hard internal ceiling; refuses further production if exceeded
//
// Provider costs (Higgsfield, Ziina, R2) are UNKNOWN — not available in the codebase.
// Values in PACKAGE_ECONOMICS are INTERNAL OPERATING TARGETS, not claimed provider costs.

export type CostGuardWarning = 'NORMAL' | 'RESERVE_USED' | 'OVER_TARGET' | 'RUNAWAY';

export interface CostGuardResult {
  proceed: boolean;
  warningLevel: CostGuardWarning;
  creditsConsumed: number;
  creditRateAed: number;
  estimatedAedConsumed: number;
  costTargetAed: number;
  safetyReserveAed: number;
  hardLimitAed: number;
  overTargetBy: number;
  reserveUsed: number;
  reason: string;
}

// Internal operating targets — NOT claimed provider costs.
// Source: user-approved economic targets 2026-09-25.
export interface PackageEconomics {
  creditsInPackage: number;
  packagePriceAed: number;
  costTargetAed: number;
  safetyReserveAed: number;
}

// Runaway guard: internal hard ceiling per production job.
// Defaults to costTarget + safetyReserve + 50% overage before refusing.
// Configurable via PRODUCTION_RUNAWAY_MULTIPLIER env var (default: 1.5).
function runawayMultiplier(): number {
  const raw = process.env.PRODUCTION_RUNAWAY_MULTIPLIER;
  if (!raw) return 1.5;
  const n = parseFloat(raw);
  return isNaN(n) || n < 1.0 ? 1.5 : n;
}

/**
 * Evaluates whether a production job should proceed based on internal economics.
 * Called server-side only. Never surfaces results to customers.
 *
 * @param creditsConsumed  Total credits consumed by this production job so far
 *                         (including all retries under the same job).
 * @param packageEconomics The economic parameters for the customer's credit package tier.
 */
export function evaluateCostGuard(
  creditsConsumed: number,
  packageEconomics: PackageEconomics,
): CostGuardResult {
  const { creditsInPackage, packagePriceAed, costTargetAed, safetyReserveAed } = packageEconomics;

  // Derive the AED-per-credit rate for this package tier.
  const creditRateAed = creditsInPackage > 0 ? packagePriceAed / creditsInPackage : 0;

  // AED equivalent of credits consumed so far.
  const estimatedAedConsumed = creditsConsumed * creditRateAed;

  // Hard runaway ceiling = (costTarget + safetyReserve) × runawayMultiplier
  const hardLimitAed = (costTargetAed + safetyReserveAed) * runawayMultiplier();

  const overTargetBy = Math.max(0, estimatedAedConsumed - costTargetAed);
  const reserveUsed = Math.max(0, estimatedAedConsumed - costTargetAed);

  // Runaway: exceeds hard limit — refuse to prevent unbounded cost exposure.
  if (estimatedAedConsumed >= hardLimitAed) {
    return {
      proceed: false,
      warningLevel: 'RUNAWAY',
      creditsConsumed,
      creditRateAed,
      estimatedAedConsumed,
      costTargetAed,
      safetyReserveAed,
      hardLimitAed,
      overTargetBy,
      reserveUsed,
      reason: `Internal cost ceiling reached (${estimatedAedConsumed.toFixed(2)} AED ≥ hard limit ${hardLimitAed.toFixed(2)} AED). Production refused to prevent runaway cost exposure.`,
    };
  }

  // Over-target but within reserve + runaway buffer — allow, flag internally.
  if (estimatedAedConsumed > costTargetAed + safetyReserveAed) {
    return {
      proceed: true,
      warningLevel: 'OVER_TARGET',
      creditsConsumed,
      creditRateAed,
      estimatedAedConsumed,
      costTargetAed,
      safetyReserveAed,
      hardLimitAed,
      overTargetBy,
      reserveUsed,
      reason: `Internal cost exceeds target + reserve (${estimatedAedConsumed.toFixed(2)} AED). Production allowed; internal review required.`,
    };
  }

  // Within reserve buffer — allow, flag reserve usage.
  if (estimatedAedConsumed > costTargetAed) {
    return {
      proceed: true,
      warningLevel: 'RESERVE_USED',
      creditsConsumed,
      creditRateAed,
      estimatedAedConsumed,
      costTargetAed,
      safetyReserveAed,
      hardLimitAed,
      overTargetBy,
      reserveUsed,
      reason: `Internal cost slightly exceeds target — absorbing with safety reserve (${reserveUsed.toFixed(2)} AED used from reserve).`,
    };
  }

  // Normal.
  return {
    proceed: true,
    warningLevel: 'NORMAL',
    creditsConsumed,
    creditRateAed,
    estimatedAedConsumed,
    costTargetAed,
    safetyReserveAed,
    hardLimitAed,
    overTargetBy: 0,
    reserveUsed: 0,
    reason: 'Within internal cost target.',
  };
}

// ─── Package tier lookup ───────────────────────────────────────────────────────
// Maps credit package sizes to their INTERNAL economic targets.
// Source: user-approved operating targets 2026-09-25.
// These are INTERNAL TARGETS, not claimed provider costs.

export const PACKAGE_ECONOMICS_TABLE: PackageEconomics[] = [
  { creditsInPackage:   600, packagePriceAed:   120, costTargetAed:    50, safetyReserveAed:   20 },
  { creditsInPackage:  2000, packagePriceAed:   350, costTargetAed:   140, safetyReserveAed:   50 },
  { creditsInPackage:  5000, packagePriceAed:   800, costTargetAed:   320, safetyReserveAed:  100 },
  { creditsInPackage: 10000, packagePriceAed:  1500, costTargetAed:   600, safetyReserveAed:  200 },
  { creditsInPackage: 25000, packagePriceAed:  3250, costTargetAed:  1300, safetyReserveAed:  400 },
  { creditsInPackage: 50000, packagePriceAed:  5500, costTargetAed:  2200, safetyReserveAed:  700 },
  { creditsInPackage: 75000, packagePriceAed:  7000, costTargetAed:  2800, safetyReserveAed: 1000 },
];

/**
 * Finds the package economics for a given credit package size.
 * Falls back to the closest tier by package size. Returns null only if table is empty.
 */
export function resolvePackageEconomics(packageCredits: number): PackageEconomics | null {
  if (PACKAGE_ECONOMICS_TABLE.length === 0) return null;

  // Exact match first.
  const exact = PACKAGE_ECONOMICS_TABLE.find((t) => t.creditsInPackage === packageCredits);
  if (exact) return exact;

  // Closest by absolute distance.
  return PACKAGE_ECONOMICS_TABLE.reduce((best, curr) =>
    Math.abs(curr.creditsInPackage - packageCredits) < Math.abs(best.creditsInPackage - packageCredits)
      ? curr
      : best,
  );
}
