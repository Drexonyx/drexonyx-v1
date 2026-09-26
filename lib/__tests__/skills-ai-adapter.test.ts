import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock global fetch before importing the module under test ─────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { callAi } from '../skills/ai/adapter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_ENV = {
  GEMINI_API_KEY: 'AIzaTestKeyAbcDefGhIjKlMnOpQrStUvWxYz0',
  SKILLS_AI_MODEL: 'gemini-2.5-flash',
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
  delete process.env.GEMINI_API_KEY;
  delete process.env.SKILLS_AI_MODEL;
}

function mockSuccess(content: string) {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: content }] } }],
    }),
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

describe('callAi (Google Gemini)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnv();
  });

  afterEach(() => {
    clearEnv();
  });

  it('returns ok:false when GEMINI_API_KEY is missing', async () => {
    setEnv({ GEMINI_API_KEY: undefined });
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.isTransient).toBe(false);
      expect(result.error).toMatch(/GEMINI_API_KEY/);
    }
  });

  it('defaults to gemini-2.5-flash when SKILLS_AI_MODEL is not set', async () => {
    setEnv({ SKILLS_AI_MODEL: undefined });
    mockSuccess('{"ok":true}');
    await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
    expect(url).toContain('gemini-2.5-flash');
  });

  it('uses SKILLS_AI_MODEL env var as the model in the request URL (DR 0073 §2.4)', async () => {
    setEnv({ SKILLS_AI_MODEL: 'gemini-1.5-flash' });
    mockSuccess('text');
    await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
    expect(url).toContain('gemini-1.5-flash');
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

  it('posts to the Gemini generateContent endpoint', async () => {
    mockSuccess('text');
    await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('sends the API key in the x-goog-api-key header, not in the URL', async () => {
    mockSuccess('text');
    await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['x-goog-api-key']).toBe(BASE_ENV.GEMINI_API_KEY);
    expect(url).not.toContain(BASE_ENV.GEMINI_API_KEY);
  });

  it('never exposes the API key in the error message', async () => {
    mockHttpError(401, 'invalid api key');
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toContain(BASE_ENV.GEMINI_API_KEY);
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

  it('marks 401 unauthorized as non-transient', async () => {
    mockHttpError(401, 'unauthorized');
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(false);
  });

  it('marks 403 forbidden as non-transient', async () => {
    mockHttpError(403, 'forbidden');
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(false);
  });

  it('includes status code in error message for HTTP errors', async () => {
    mockHttpError(400, 'API key not valid. Please pass a valid API key.');
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('400');
      expect(result.error).toContain('API key not valid');
    }
  });

  it('redacts Gemini API key patterns from error messages', async () => {
    mockHttpError(401, 'Invalid key AIzaAbcDefGhIjKlMnOpQrStUvWxYz01234 provided');
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toContain('AIzaAbcDefGhIjKlMnOpQrStUvWxYz01234');
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
      json: async () => ({ candidates: [{ content: { parts: [{ text: '' }] } }] }),
    });
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
  });

  it('returns ok:false for missing candidates in response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [] }),
    });
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
  });

  it('sends system_instruction and user contents in the request body', async () => {
    mockSuccess('response');
    await callAi({ systemPrompt: 'system instruction', userPrompt: 'user query' });
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.system_instruction.parts[0].text).toBe('system instruction');
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'user query' }] },
    ]);
  });

  it('defaults maxOutputTokens to 1600 when no override is given', async () => {
    mockSuccess('response');
    await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.generationConfig.maxOutputTokens).toBe(1600);
  });

  it('respects per-call maxTokens override', async () => {
    mockSuccess('response');
    await callAi({ systemPrompt: 'sys', userPrompt: 'user', maxTokens: 512 });
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.generationConfig.maxOutputTokens).toBe(512);
  });

  it('sets responseMimeType to application/json in generationConfig', async () => {
    mockSuccess('{"ok":true}');
    await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('skips thought:true parts and returns the actual response text', async () => {
    const actualResponse = '{"angles":["a"],"themes":["t"],"channels":["Facebook"],"keyMessages":["m"]}';
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            parts: [
              { thought: true, text: 'Let me think about this campaign strategy...' },
              { text: actualResponse },
            ],
          },
        }],
      }),
    });
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe(actualResponse);
  });

  it('returns ok:false when only thought:true parts are present (no actual response)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            parts: [
              { thought: true, text: 'Thinking about the strategy...' },
            ],
          },
        }],
      }),
    });
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(false);
  });

  it('handles multiple thought parts before the actual response', async () => {
    const actualResponse = '{"result":"value"}';
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            parts: [
              { thought: true, text: 'First reasoning step...' },
              { thought: true, text: 'Second reasoning step...' },
              { text: actualResponse },
            ],
          },
        }],
      }),
    });
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe(actualResponse);
  });
});
