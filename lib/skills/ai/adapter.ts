// DR 0073 §2.2: Sole location within lib/skills/ where any AI provider SDK or API key is accessed.
// Provider: Google Gemini (REST API via generativelanguage.googleapis.com).
// DR 0073 §2.4: Model identifier read from SKILLS_AI_MODEL env var; default = gemini-2.5-flash.
// DR 0073 §2.5: API key stored exclusively as server-side env var; never logged or returned to callers.
// DR 0073 §2.6: Each skill.execute() makes at most ONE call to callAi().

// Gemini structured-output schema type (OpenAPI Schema Object subset).
// Pass responseSchema in any AiAdapterRequest to constrain Gemini's output.
export type GeminiSchemaType = 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean';

export interface GeminiSchema {
  type: GeminiSchemaType;
  nullable?: boolean;
  description?: string;
  enum?: string[];
  properties?: Record<string, GeminiSchema>;
  required?: string[];
  items?: GeminiSchema;
}

export interface AiAdapterRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  responseSchema?: GeminiSchema;
}

export type AiAdapterResult =
  | { ok: true; text: string }
  | { ok: false; error: string; isTransient: boolean };

export type AiTypedResult<T> =
  | { ok: true; output: T }
  | { ok: false; error: string; isTransient: boolean };

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash';

// Retry policy: up to 2 retries after the initial attempt (3 total), backoff in ms.
// Only transient errors (429 / 5xx / network failure) are retried.
// Jitter (±30%) spreads concurrent retries over time so a burst of simultaneous
// calls does not produce a thundering-herd storm against an already-busy endpoint.
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

// Returns baseMs ± 30% random jitter, clamped to a minimum of 200ms.
function jitteredDelay(baseMs: number): number {
  const spread = baseMs * 0.3;
  return Math.max(200, Math.round(baseMs + (Math.random() * 2 - 1) * spread));
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
          ...(request.responseSchema !== undefined ? { responseSchema: request.responseSchema } : {}),
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
      const baseMs = RETRY_BACKOFF_MS[attempt - 1] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1];
      await sleep(jitteredDelay(baseMs));
    }

    lastResult = await attemptAiCall(endpoint, apiKey, request);

    if (lastResult.ok) return lastResult;
    // Only retry transient failures; permanent errors fail immediately.
    if (!lastResult.isTransient) return lastResult;
  }

  // All retries exhausted — return the last transient error as-is.
  return lastResult!;
}

// Wraps callAi: parses the JSON response and validates it with the supplied validator.
// Returns distinct errors for: HTTP/provider failure, JSON parse failure, schema validation failure.
// `validate` must throw an Error with a descriptive message when the parsed value is invalid.
export async function callAiTyped<T>(
  request: AiAdapterRequest & { responseSchema: GeminiSchema },
  validate: (parsed: unknown) => T,
): Promise<AiTypedResult<T>> {
  const result = await callAi(request);
  if (!result.ok) return result;

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `AI response is not valid JSON: ${msg.slice(0, 200)}`, isTransient: false };
  }

  try {
    const output = validate(parsed);
    return { ok: true, output };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `AI response failed schema validation: ${msg.slice(0, 300)}`, isTransient: false };
  }
}
