import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock global fetch before importing the module under test ─────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { callAiTyped } from '../skills/ai/adapter';
import type { GeminiSchema } from '../skills/ai/adapter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_ENV = {
  GEMINI_API_KEY: 'AIzaTestKeyAbcDefGhIjKlMnOpQrStUvWxYz0',
  SKILLS_AI_MODEL: 'gemini-2.5-flash',
};

function setEnv(overrides: Record<string, string | undefined> = {}) {
  const merged = { ...BASE_ENV, ...overrides };
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function clearEnv() {
  delete process.env.GEMINI_API_KEY;
  delete process.env.SKILLS_AI_MODEL;
}

function mockGeminiSuccess(text: string) {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
  });
}

function mockGeminiError(status: number, message = 'error') {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ error: { message } }),
  });
}

const SIMPLE_SCHEMA: GeminiSchema = {
  type: 'object',
  properties: { name: { type: 'string' }, count: { type: 'number' } },
  required: ['name', 'count'],
};

interface SimpleOutput { name: string; count: number }

function validateSimple(parsed: unknown): SimpleOutput {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('expected object');
  }
  const o = parsed as Record<string, unknown>;
  if (typeof o.name !== 'string') throw new Error('name must be a string');
  if (typeof o.count !== 'number') throw new Error('count must be a number');
  return { name: o.name, count: o.count };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('callAiTyped', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnv();
    vi.useFakeTimers();
  });

  afterEach(() => {
    clearEnv();
    vi.useRealTimers();
  });

  it('returns ok:true with typed output when JSON is valid and validator passes', async () => {
    mockGeminiSuccess('{"name":"test","count":42}');

    const result = await callAiTyped(
      { systemPrompt: 'sys', userPrompt: 'user', responseSchema: SIMPLE_SCHEMA },
      validateSimple,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toEqual({ name: 'test', count: 42 });
  });

  it('includes responseSchema in the Gemini request body', async () => {
    mockGeminiSuccess('{"name":"test","count":1}');

    await callAiTyped(
      { systemPrompt: 'sys', userPrompt: 'user', responseSchema: SIMPLE_SCHEMA },
      validateSimple,
    );

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.generationConfig.responseSchema).toEqual(SIMPLE_SCHEMA);
  });

  it('returns ok:false with JSON error when response is not valid JSON', async () => {
    mockGeminiSuccess('not valid json here');

    const result = await callAiTyped(
      { systemPrompt: 'sys', userPrompt: 'user', responseSchema: SIMPLE_SCHEMA },
      validateSimple,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.isTransient).toBe(false);
    expect(result.error).toContain('not valid JSON');
  });

  it('returns ok:false with validation error when validator throws', async () => {
    mockGeminiSuccess('{"name":"test","count":"not-a-number"}');

    const result = await callAiTyped(
      { systemPrompt: 'sys', userPrompt: 'user', responseSchema: SIMPLE_SCHEMA },
      validateSimple,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.isTransient).toBe(false);
    expect(result.error).toContain('schema validation');
    expect(result.error).toContain('count must be a number');
  });

  it('propagates callAi failure (HTTP error) with isTransient preserved', async () => {
    mockGeminiError(503, 'Service unavailable');
    const promise = callAiTyped(
      { systemPrompt: 'sys', userPrompt: 'user', responseSchema: SIMPLE_SCHEMA },
      validateSimple,
    );
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.isTransient).toBe(true);
    expect(result.error).toContain('AI provider error');
  });

  it('propagates non-transient callAi failure', async () => {
    mockGeminiError(400, 'bad request');

    const result = await callAiTyped(
      { systemPrompt: 'sys', userPrompt: 'user', responseSchema: SIMPLE_SCHEMA },
      validateSimple,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.isTransient).toBe(false);
  });

  it('distinguishes JSON parse error from schema validation error', async () => {
    mockGeminiSuccess('{"name":"only-name"}');

    const strictValidator = (parsed: unknown): SimpleOutput => {
      if (typeof parsed !== 'object' || parsed === null) throw new Error('not an object');
      const o = parsed as Record<string, unknown>;
      if (typeof o.count !== 'number') throw new Error('count is required and must be a number');
      return { name: String((o as Record<string, unknown>).name), count: o.count };
    };

    const result = await callAiTyped(
      { systemPrompt: 'sys', userPrompt: 'user', responseSchema: SIMPLE_SCHEMA },
      strictValidator,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('schema validation');
    expect(result.error).not.toContain('not valid JSON');
  });
});
