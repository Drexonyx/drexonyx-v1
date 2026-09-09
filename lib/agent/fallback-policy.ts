// DR 0085: Controlled Provider Fallback.
// Fallback is only permitted when:
//   (a) the failure is explicitly classified as transient, AND
//   (b) an approved fallback provider exists for the (provider, model) combination.
//
// In V1: no approved fallback provider exists for any (provider, model) combination.
// All requests for fallback resolve to { hasFallback: false }.
//
// DO NOT add a fallback provider without Owner approval and a new DR.
// DO NOT fall back for: invalid input, invalid model, auth failure, policy rejection,
//   malformed request, content errors, or any non-transient failure classification.

// Classification of a provider failure — determines fallback eligibility.
export type FailureClassification = 'transient' | 'non_transient';

// Result of a fallback policy lookup.
// In V1, hasFallback is always false — no approved fallback provider exists.
export type FallbackDecision =
  | { hasFallback: false; reason: string }
  | { hasFallback: true; fallbackProviderName: string; fallbackModel: string };

// Classifies a provider dispatch or polling failure as transient or non-transient.
// Non-transient failures must never trigger fallback.
//
// isTransient comes from the provider adapter's DispatchResult or PollStatusResult.
// Non-transient causes (examples): invalid model, auth failure, content policy (nsfw),
//   malformed request body, client error (4xx other than 429).
export function classifyProviderFailure(isTransient: boolean): FailureClassification {
  return isTransient ? 'transient' : 'non_transient';
}

// Returns the fallback decision for a given (provider, model) pair and failure classification.
// Fails closed: always returns hasFallback=false in V1.
//
// Non-transient failures: explicitly ineligible for fallback.
// Transient failures: eligible in principle, but no approved fallback exists.
//
// When a second provider is approved (future phase, requires DR), this function
// is the single location where that approval is applied.
export function getFallbackDecision(
  classification: FailureClassification,
  _providerName: string,
  _model: string,
): FallbackDecision {
  if (classification === 'non_transient') {
    return { hasFallback: false, reason: 'non_transient_failure_not_eligible_for_fallback' };
  }

  // Transient failure — check approved fallback table.
  // V1: no approved fallback provider for any (provider, model) combination.
  return { hasFallback: false, reason: 'no_approved_fallback_provider_in_v1' };
}
