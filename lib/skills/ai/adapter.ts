// DR 0073 §2.2: Sole location within lib/skills/ where any AI provider SDK or API key is accessed.
// Provider: Google Gemini (REST API via generativelanguage.googleapis.com).
// DR 0073 §2.4: Model identifier read from SKILLS_AI_MODEL env var; default = gemini-2.5-flash.
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

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash';

// Retry policy: up to 2 retries after the initial attempt (3 total), backoff in ms.
// Only transient errors (429 / 5xx / network failure) are retried.
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = [1000, 3000] as const;

// Redact any credential-like values from provider error strings before surfacing them.
function redactCredentials(text: string): string {
  return text
    .replace(/AIza[A-Za-z0-9_-]{30,}/g, '[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]{20,}/gi, 'Bearer [REDACTED]');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attemptAiCall(
  endpoint: string,
  apiKey: string,
  request: AiAdapterRequest,
): Promise<AiAdapterResult> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: request.systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: request.userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: request.maxTokens ?? 1600,
          candidateCount: 1,
        },
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
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string; thought?: boolean }> };
      }>;
    };
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    // Gemini 2.5+ thinking models prepend thought:true reasoning parts before the
    // actual response. Skip them to reach the generated text.
    const text = parts.find(p => p.thought !== true && typeof p.text === 'string')?.text ?? '';
    if (!text) {
      return { ok: false, error: 'AI provider returned empty response', isTransient: false };
    }

    return { ok: true, text };
  } catch {
    // Network-level failures (DNS failure, connection refused, etc.) are transient.
    return { ok: false, error: 'AI adapter network error', isTransient: true };
  }
}

export async function callAi(request: AiAdapterRequest): Promise<AiAdapterResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'GEMINI_API_KEY is not configured', isTransient: false };
  }

  const model = process.env.SKILLS_AI_MODEL ?? DEFAULT_MODEL;
  const endpoint = `${GEMINI_BASE}/${model}:generateContent`;

  let lastResult: AiAdapterResult | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BACKOFF_MS[attempt - 1] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]);
    }

    lastResult = await attemptAiCall(endpoint, apiKey, request);

    if (lastResult.ok) return lastResult;
    // Only retry transient failures; permanent errors fail immediately.
    if (!lastResult.isTransient) return lastResult;
  }

  // All retries exhausted — return the last transient error as-is.
  return lastResult!;
}
