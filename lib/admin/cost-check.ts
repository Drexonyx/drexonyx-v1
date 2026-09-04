// DR 0043 §5.4: Cost Check states — NOT_READY | FAIL | PASS.
// estimated_cost must be present and > 0 to PASS.
// OWNER and ADMIN_OPERATIONS may set estimated_cost while the quote is DRAFT.

export type CostCheckState = 'NOT_READY' | 'FAIL' | 'PASS';

export interface CostCheckResult {
  state: CostCheckState;
  estimated_cost: string | null;
  reason: string;
}

export function runCostCheck(quote: {
  estimated_cost: string | null;
  total_amount: string;
}): CostCheckResult {
  if (quote.estimated_cost === null) {
    return {
      state: 'NOT_READY',
      estimated_cost: null,
      reason: 'estimated_cost has not been set',
    };
  }

  const cost = parseFloat(quote.estimated_cost);

  if (isNaN(cost) || cost <= 0) {
    return {
      state: 'FAIL',
      estimated_cost: quote.estimated_cost,
      reason: 'estimated_cost must be greater than zero',
    };
  }

  return {
    state: 'PASS',
    estimated_cost: quote.estimated_cost,
    reason: 'estimated_cost is present and valid',
  };
}
