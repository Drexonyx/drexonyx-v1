import { describe, it, expect } from 'vitest';
import { isRetryable, MAX_STEP_RETRIES, RETRY_BACKOFF_MS } from '../retry';

describe('isRetryable', () => {
  it('returns true for transient failure within retry cap', () => {
    expect(isRetryable(true, 0)).toBe(true);
    expect(isRetryable(true, 1)).toBe(true);
  });

  it('returns false when retry cap is reached', () => {
    expect(isRetryable(true, MAX_STEP_RETRIES)).toBe(false);
    expect(isRetryable(true, MAX_STEP_RETRIES + 1)).toBe(false);
  });

  it('returns false for non-transient errors regardless of count', () => {
    expect(isRetryable(false, 0)).toBe(false);
    expect(isRetryable(false, 1)).toBe(false);
  });
});

describe('retry policy constants', () => {
  it('MAX_STEP_RETRIES is 2', () => {
    expect(MAX_STEP_RETRIES).toBe(2);
  });

  it('RETRY_BACKOFF_MS has two entries: 5s and 30s', () => {
    expect(RETRY_BACKOFF_MS).toHaveLength(2);
    expect(RETRY_BACKOFF_MS[0]).toBe(5_000);
    expect(RETRY_BACKOFF_MS[1]).toBe(30_000);
  });
});
