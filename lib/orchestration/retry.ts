// Retry policy constants for orchestration step execution (Architecture v2 §14).
// runner.ts enforces this policy; external scheduler enforces the backoff delays.

export const MAX_STEP_RETRIES = 2;

// Backoff durations in milliseconds. Index = retry attempt (0-based).
// Scheduling of retries is external to the runner (no inline sleep).
export const RETRY_BACKOFF_MS: readonly [number, number] = [5_000, 30_000];

// Returns true if a failed step is eligible for another retry attempt.
export function isRetryable(isTransient: boolean, currentRetryCount: number): boolean {
  return isTransient && currentRetryCount < MAX_STEP_RETRIES;
}
