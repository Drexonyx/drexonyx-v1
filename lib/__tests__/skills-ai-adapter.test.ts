import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock global fetch before importing the module under test ─────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { callAi } from '../skills/ai/adapter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_ENV = {
  OPENROUTER_API_KEY: 'sk-or-test-key-abcdefgh',
  SKILLS_AI_MODEL: 'openrouter/free',
};

function setEnv(overrides: Record<string, string | undefined> = {}) {
  const merged = { ...BASE_ENV, ...overrides };
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

function clearEnv() {
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.SKILLS_AI_MODEL;
}

function mockSuccess(content: string) {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  });
}

function mockHttpError(status: number, message = 'error') {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ error: { message } }),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('callAi (OpenRouter)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnv();
  });

  afterEach(() => {
    clearEnv();
  });

  it('returns ok:false when OPENROUTER_API_KEY is missing', async () => {
    setEnv({ OPENROUTER_API_KEY: undefined });
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.isTransient).toBe(false);
      expect(result.error).toMatch(/OPENROUTER_API_KEY/);
    }
  });

  it('defaults to openrouter/free when SKILLS_AI_MODEL is not set', async () => {
    setEnv({ SKILLS_AI_MODEL: undefined });
    mockSuccess('{"ok":true}');
    await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.model).toBe('openrouter/free');
  });

  it('uses SKILLS_AI_MODEL env var as model (DR 0073 §2.4)', async () => {
    setEnv({ SKILLS_AI_MODEL: 'meta-llama/llama-3.1-8b-instruct:free' });
    mockSuccess('text');
    await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.model).toBe('meta-llama/llama-3.1-8b-instruct:free');
  });

  it('normalizes bare Anthropic model ID to OpenRouter provider-scoped format', async () => {
    setEnv({ SKILLS_AI_MODEL: 'claude-sonnet-4-6' });
    mockSuccess('text');
    await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.model).toBe('anthropic/claude-sonnet-4-6');
  });

  it('does not double-prefix an already scoped anthropic model ID', async () => {
    setEnv({ SKILLS_AI_MODEL: 'anthropic/claude-sonnet-4-6' });
    mockSuccess('text');
    await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.model).toBe('anthropic/claude-sonnet-4-6');
  });

  it('returns ok:true with text on successful AI call', async () => {
    const responseText = '{"result":"value"}';
    mockSuccess(responseText);
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe(responseText);
  });

  it('makes exactly one fetch call per invocation (DR 0073 §2.6)', async () => {
    mockSuccess('text');
    await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('posts to the OpenRouter chat completions endpoint', async () => {
    mockSuccess('text');
    await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('never exposes the API key in the error message', async () => {
    mockHttpError(401, 'invalid api key');
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toContain('sk-or-test-key-abcdefgh');
    }
  });

  it('marks 429 rate limit as transient', async () => {
    mockHttpError(429, 'rate limited');
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(true);
  });

  it('marks 500 server error as transient', async () => {
    mockHttpError(500, 'server error');
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(true);
  });

  it('marks 400 as non-transient', async () => {
    mockHttpError(400, 'bad request');
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(false);
  });

  it('marks 402 as non-transient and prefixes error with "AI credit limit reached"', async () => {
    mockHttpError(402, 'You requested up to 1024 tokens, but can only afford 800.');
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.isTransient).toBe(false);
      expect(result.error).toMatch(/^AI credit limit reached/);
    }
  });

  it('marks 401 unauthorized as non-transient', async () => {
    mockHttpError(401, 'unauthorized');
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(false);
  });

  it('includes status code in error message for HTTP errors', async () => {
    mockHttpError(400, 'invalid_request_error: max_tokens too large');
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('400');
      expect(result.error).toContain('invalid_request_error');
    }
  });

  it('redacts credential patterns from error messages', async () => {
    mockHttpError(401, 'Invalid key sk-or-abcdefghijklmnopqrstuvwxyz provided');
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toContain('sk-or-abcdefghijklmnopqrstuvwxyz');
      expect(result.error).toContain('[REDACTED]');
    }
  });

  it('network failure is transient', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(true);
  });

  it('returns ok:false for empty response content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    });
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
  });

  it('sends system and user messages in the request body', async () => {
    mockSuccess('response');
    await callAi({ systemPrompt: 'system instruction', userPrompt: 'user query' });
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.messages).toEqual([
      { role: 'system', content: 'system instruction' },
      { role: 'user', content: 'user query' },
    ]);
  });

  it('defaults max_tokens to 1600 when no override is given', async () => {
    mockSuccess('response');
    await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.max_tokens).toBe(1600);
  });

  it('respects per-call maxTokens override', async () => {
    mockSuccess('response');
    await callAi({ systemPrompt: 'sys', userPrompt: 'user', maxTokens: 512 });
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.max_tokens).toBe(512);
  });
});
