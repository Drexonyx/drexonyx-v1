import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockCreate, MockAPIError } = vi.hoisted(() => {
  class MockAPIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'APIError';
    }
  }
  return { mockCreate: vi.fn(), MockAPIError };
});

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockCreate };
    // Static APIError must be on the class itself since adapter does Anthropic.APIError
    static APIError = MockAPIError;
  }
  return { default: MockAnthropic };
});

import { callAi } from '../skills/ai/adapter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_ENV = {
  SKILLS_AI_MODEL: 'claude-sonnet-4-6',
  ANTHROPIC_API_KEY: 'sk-test-key',
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
  delete process.env.SKILLS_AI_MODEL;
  delete process.env.ANTHROPIC_API_KEY;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('callAi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnv();
  });

  afterEach(() => {
    clearEnv();
  });

  it('returns ok:false when SKILLS_AI_MODEL is missing', async () => {
    setEnv({ SKILLS_AI_MODEL: undefined });
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(false);
  });

  it('returns ok:false when ANTHROPIC_API_KEY is missing', async () => {
    setEnv({ ANTHROPIC_API_KEY: undefined });
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(false);
  });

  it('never exposes the API key in the error message', async () => {
    mockCreate.mockRejectedValue(new Error('some error'));
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toContain('sk-test-key');
    }
  });

  it('makes exactly one AI call per invocation (DR 0073 §2.6)', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: '{"ok":true}' }] });
    await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it('returns ok:true with text on successful AI call', async () => {
    const responseText = '{"result":"value"}';
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: responseText }] });
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe(responseText);
  });

  it('uses SKILLS_AI_MODEL env var as model (DR 0073 §2.4)', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'text' }] });
    await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-sonnet-4-6' }),
    );
  });

  it('marks 529 status as transient (DR 0073)', async () => {
    mockCreate.mockRejectedValue(new MockAPIError(529, 'overloaded'));
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(true);
  });

  it('marks 500 status as transient (DR 0073)', async () => {
    mockCreate.mockRejectedValue(new MockAPIError(500, 'server error'));
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(true);
  });

  it('marks 400 status as non-transient (DR 0073)', async () => {
    mockCreate.mockRejectedValue(new MockAPIError(400, 'bad request'));
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(false);
  });

  it('non-APIError exceptions are non-transient', async () => {
    mockCreate.mockRejectedValue(new Error('network failure'));
    const result = await callAi({ systemPrompt: 'sys', userPrompt: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.isTransient).toBe(false);
  });
});
