// DR 0073 §2.2: Sole location within lib/skills/ where any AI provider SDK or API key is accessed.
// Provider: OpenRouter (OpenAI-compatible REST API).
// DR 0073 §2.4: Model identifier read from SKILLS_AI_MODEL env var; default = openrouter/free.
// DR 0073 §2.5: API key stored exclusively as server-side env var; never logged or returned to callers.
// DR 0073 §2.6: Each skill.execute() makes at most ONE call to callAi().

export interface AiAdapterRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}

export type AiAdapterResult =
  | { ok: true; text: string }
  | { ok: false; error: string; isTransient: boolean };

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openrouter/free';

// Redact any credential-like values from provider error strings before surfacing them.
function redactCredentials(text: string): string {
  return text
    .replace(/sk-or-[A-Za-z0-9_-]{10,}/g, '[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]{20,}/gi, 'Bearer [REDACTED]');
}

export async function callAi(request: AiAdapterRequest): Promise<AiAdapterResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'OPENROUTER_API_KEY is not configured', isTransient: false };
  }

  // Normalize bare Anthropic model IDs (e.g. "claude-sonnet-4-6") to the
  // OpenRouter provider-scoped format ("anthropic/claude-sonnet-4-6").
  // IDs that already contain a "/" (e.g. "openrouter/free") are passed through unchanged.
  const rawModel = process.env.SKILLS_AI_MODEL ?? DEFAULT_MODEL;
  const model = rawModel.startsWith('claude-') && !rawModel.includes('/')
    ? `anthropic/${rawModel}`
    : rawModel;

  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxTokens ?? 1600,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      // 429 = rate limit; 5xx = transient server errors
      const isTransient = response.status === 429 || response.status >= 500;
      let detail = `status ${response.status}`;
      try {
        const body = await response.json() as Record<string, unknown>;
        const msg =
          (body?.error as Record<string, unknown> | undefined)?.message ??
          body?.message ??
          '';
        if (msg) detail += `: ${redactCredentials(String(msg))}`;
      } catch {
        // ignore JSON parse failure — detail already contains the status code
      }
      return { ok: false, error: `AI provider error (${detail})`, isTransient };
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data?.choices?.[0]?.message?.content ?? '';
    if (!text) {
      return { ok: false, error: 'AI provider returned empty response', isTransient: false };
    }

    return { ok: true, text };
  } catch {
    // Network-level failures (DNS failure, connection refused, etc.) are transient.
    return { ok: false, error: 'AI adapter error', isTransient: true };
  }
}
