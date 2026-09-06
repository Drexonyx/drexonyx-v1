// DR 0085: Controlled Provider Fallback tests.
// Covers: non-transient failure not eligible, transient failure with no approved fallback,
// no autonomous fallback, correct classification.
import { describe, it, expect } from 'vitest';

import {
  classifyProviderFailure,
  getFallbackDecision,
} from '../agent/fallback-policy';

describe('DR 0085 — classifyProviderFailure', () => {
  it('classifies isTransient=true as transient', () => {
    expect(classifyProviderFailure(true)).toBe('transient');
  });

  it('classifies isTransient=false as non_transient', () => {
    expect(classifyProviderFailure(false)).toBe('non_transient');
  });
});

describe('DR 0085 — getFallbackDecision', () => {
  // ─── Non-transient failures are never eligible for fallback ──────────────────

  it('returns hasFallback=false for a non_transient failure', () => {
    const decision = getFallbackDecision('non_transient', 'higgsfield', 'text2image/soul');
    expect(decision.hasFallback).toBe(false);
  });

  it('non_transient failure reason indicates ineligibility', () => {
    const decision = getFallbackDecision('non_transient', 'higgsfield', 'text2image/soul');
    expect(decision.hasFallback).toBe(false);
    if (!decision.hasFallback) {
      expect(decision.reason).toContain('non_transient');
    }
  });

  it('returns hasFallback=false for invalid model failure (non-transient)', () => {
    const decision = getFallbackDecision('non_transient', 'higgsfield', 'unknown-model');
    expect(decision.hasFallback).toBe(false);
  });

  it('returns hasFallback=false for auth failure (non-transient)', () => {
    const decision = getFallbackDecision('non_transient', 'higgsfield', 'image2video/dop');
    expect(decision.hasFallback).toBe(false);
  });

  it('returns hasFallback=false for nsfw content rejection (non-transient)', () => {
    const decision = getFallbackDecision('non_transient', 'higgsfield', 'text2image/soul');
    expect(decision.hasFallback).toBe(false);
  });

  // ─── Transient failures fail closed (no approved fallback in V1) ──────────────

  it('returns hasFallback=false for a transient failure — no approved fallback provider exists', () => {
    const decision = getFallbackDecision('transient', 'higgsfield', 'text2image/soul');
    expect(decision.hasFallback).toBe(false);
  });

  it('transient failure reason indicates no approved fallback provider', () => {
    const decision = getFallbackDecision('transient', 'higgsfield', 'image2video/dop');
    expect(decision.hasFallback).toBe(false);
    if (!decision.hasFallback) {
      expect(decision.reason).toContain('no_approved_fallback');
    }
  });

  it('returns hasFallback=false for any model when failure is transient', () => {
    const models = ['text2image/soul', 'image2video/dop', 'speak/higgsfield'];
    for (const model of models) {
      const decision = getFallbackDecision('transient', 'higgsfield', model);
      expect(decision.hasFallback).toBe(false);
    }
  });

  // ─── No autonomous fallback ───────────────────────────────────────────────────

  it('never selects a fallback provider autonomously', () => {
    // Regardless of inputs, no fallback is returned in V1
    const combinations = [
      ['transient', 'higgsfield', 'text2image/soul'],
      ['non_transient', 'higgsfield', 'text2image/soul'],
      ['transient', 'openai', 'gpt-4'],
      ['non_transient', 'anthropic', 'claude-sonnet-4-6'],
    ] as const;
    for (const [cls, provider, model] of combinations) {
      const decision = getFallbackDecision(cls as 'transient' | 'non_transient', provider, model);
      expect(decision.hasFallback).toBe(false);
    }
  });

  // ─── Full pipeline: classify then decide ─────────────────────────────────────

  it('correctly chains classify → decide for a transient failure scenario', () => {
    const classification = classifyProviderFailure(true);
    const decision = getFallbackDecision(classification, 'higgsfield', 'speak/higgsfield');
    expect(classification).toBe('transient');
    expect(decision.hasFallback).toBe(false);
  });

  it('correctly chains classify → decide for a non-transient failure scenario', () => {
    const classification = classifyProviderFailure(false);
    const decision = getFallbackDecision(classification, 'higgsfield', 'text2image/soul');
    expect(classification).toBe('non_transient');
    expect(decision.hasFallback).toBe(false);
  });
});
