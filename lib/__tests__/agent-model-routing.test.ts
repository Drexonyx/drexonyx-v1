// DR 0084: Deterministic Model Routing tests.
// Covers: approved skill/model/provider mapping, unknown-fails-closed,
// deterministic provider selection, all approved routes present.
import { describe, it, expect } from 'vitest';

import { resolveProviderForModel, listApprovedRoutes } from '../agent/model-routing';

describe('DR 0084 — resolveProviderForModel', () => {
  // ─── Approved mappings ────────────────────────────────────────────────────────

  it('resolves higgsfield + text2image/soul to the Higgsfield provider', () => {
    const route = resolveProviderForModel('higgsfield', 'text2image/soul');
    expect(route).not.toBeNull();
    expect(route?.providerName).toBe('higgsfield');
    expect(route?.model).toBe('text2image/soul');
    expect(route?.provider).toBeDefined();
    expect(route?.provider.name).toBe('higgsfield');
  });

  it('resolves higgsfield + image2video/dop to the Higgsfield provider', () => {
    const route = resolveProviderForModel('higgsfield', 'image2video/dop');
    expect(route).not.toBeNull();
    expect(route?.provider.name).toBe('higgsfield');
    expect(route?.model).toBe('image2video/dop');
  });

  it('resolves higgsfield + speak/higgsfield to the Higgsfield provider', () => {
    const route = resolveProviderForModel('higgsfield', 'speak/higgsfield');
    expect(route).not.toBeNull();
    expect(route?.provider.name).toBe('higgsfield');
    expect(route?.model).toBe('speak/higgsfield');
  });

  // ─── Deterministic — same inputs always return same provider ──────────────────

  it('returns the same provider instance on repeated calls (deterministic)', () => {
    const route1 = resolveProviderForModel('higgsfield', 'text2image/soul');
    const route2 = resolveProviderForModel('higgsfield', 'text2image/soul');
    expect(route1?.provider).toBe(route2?.provider);
  });

  // ─── Unknown provider fails closed ────────────────────────────────────────────

  it('returns null for an unknown provider name', () => {
    expect(resolveProviderForModel('openai', 'gpt-4')).toBeNull();
  });

  it('returns null for an empty provider name', () => {
    expect(resolveProviderForModel('', 'text2image/soul')).toBeNull();
  });

  it('returns null for a provider that does not exist in the routing table', () => {
    expect(resolveProviderForModel('anthropic', 'claude-sonnet-4-6')).toBeNull();
  });

  // ─── Unknown model fails closed ───────────────────────────────────────────────

  it('returns null for a known provider but unknown model', () => {
    expect(resolveProviderForModel('higgsfield', 'text2video/unknown-model')).toBeNull();
  });

  it('returns null for higgsfield + empty model string', () => {
    expect(resolveProviderForModel('higgsfield', '')).toBeNull();
  });

  it('returns null for higgsfield + an unofficial or removed model identifier', () => {
    expect(resolveProviderForModel('higgsfield', 'hf-video-v1')).toBeNull();
    expect(resolveProviderForModel('higgsfield', 'model')).toBeNull();
    expect(resolveProviderForModel('higgsfield', 'succeeded')).toBeNull();
  });

  // ─── No autonomous provider selection ────────────────────────────────────────

  it('does not fall back to any provider when the route is unknown', () => {
    const route = resolveProviderForModel('nonexistent', 'some-model');
    expect(route).toBeNull();
  });
});

describe('DR 0084 — listApprovedRoutes', () => {
  it('returns exactly three approved routes (all verified Higgsfield models)', () => {
    const routes = listApprovedRoutes();
    expect(routes).toHaveLength(3);
  });

  it('lists all three approved Higgsfield models', () => {
    const routes = listApprovedRoutes();
    const models = routes.map((r) => r.model);
    expect(models).toContain('text2image/soul');
    expect(models).toContain('image2video/dop');
    expect(models).toContain('speak/higgsfield');
  });

  it('all approved routes reference the higgsfield provider', () => {
    const routes = listApprovedRoutes();
    for (const r of routes) {
      expect(r.providerName).toBe('higgsfield');
    }
  });
});
