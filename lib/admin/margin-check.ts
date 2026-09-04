// DR 0043 §6.3: gross_margin_rate = (total_amount - estimated_cost) / total_amount
// §6.5: minimum_acceptable_margin_rate is the binding PASS/FAIL threshold.
//        target_margin_rate is informational only — not used for PASS/FAIL.
// Intermediate precision: NUMERIC(19,8) — toFixed(8).

export type MarginCheckState = 'NOT_READY' | 'FAIL' | 'PASS';

export interface MarginCheckResult {
  state: MarginCheckState;
  gross_margin_rate: string | null;
  minimum_acceptable_margin_rate: string | null;
  target_margin_rate: string | null;
  reason: string;
}

export function runMarginCheck(
  quote: { estimated_cost: string | null; total_amount: string },
  pricingConfig: {
    minimum_acceptable_margin_rate: string;
    target_margin_rate: string | null;
  } | null,
): MarginCheckResult {
  const minRate = pricingConfig?.minimum_acceptable_margin_rate ?? null;
  const targetRate = pricingConfig?.target_margin_rate ?? null;

  // Cost Check must have passed first; estimated_cost must be present and > 0.
  const estimatedCost = quote.estimated_cost !== null ? parseFloat(quote.estimated_cost) : NaN;
  if (isNaN(estimatedCost) || estimatedCost <= 0) {
    return {
      state: 'NOT_READY',
      gross_margin_rate: null,
      minimum_acceptable_margin_rate: minRate,
      target_margin_rate: targetRate,
      reason: 'Cost Check has not passed; cannot compute margin',
    };
  }

  if (pricingConfig === null) {
    return {
      state: 'NOT_READY',
      gross_margin_rate: null,
      minimum_acceptable_margin_rate: null,
      target_margin_rate: null,
      reason: 'No pricing configuration found for this organization',
    };
  }

  const totalAmount = parseFloat(quote.total_amount);
  if (isNaN(totalAmount) || totalAmount <= 0) {
    return {
      state: 'FAIL',
      gross_margin_rate: null,
      minimum_acceptable_margin_rate: minRate,
      target_margin_rate: targetRate,
      reason: 'total_amount must be greater than zero to compute margin',
    };
  }

  // NUMERIC(19,8) intermediate precision (toFixed(8))
  const grossMarginRate = (totalAmount - estimatedCost) / totalAmount;
  const grossMarginRateStr = grossMarginRate.toFixed(8);
  const minimumRate = parseFloat(pricingConfig.minimum_acceptable_margin_rate);

  if (grossMarginRate >= minimumRate) {
    return {
      state: 'PASS',
      gross_margin_rate: grossMarginRateStr,
      minimum_acceptable_margin_rate: minRate,
      target_margin_rate: targetRate,
      reason: 'Gross margin rate meets or exceeds the minimum acceptable threshold',
    };
  }

  return {
    state: 'FAIL',
    gross_margin_rate: grossMarginRateStr,
    minimum_acceptable_margin_rate: minRate,
    target_margin_rate: targetRate,
    reason: 'Gross margin rate is below the minimum acceptable threshold',
  };
}
