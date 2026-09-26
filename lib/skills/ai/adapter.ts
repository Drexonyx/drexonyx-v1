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

// Redact any credential-like values from provider error strings before surfacing them.
function redactCredentials(text: string): string {
  return text
    .replace(/AIza[A-Za-z0-9_-]{30,}/g, '[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]{20,}/gi, 'Bearer [REDACTED]');
}

export async function callAi(request: AiAdapterRequest): Promise<AiAdapterResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'GEMINI_API_KEY is not configured', isTransient: false };
  }

  const model = process.env.SKILLS_AI_MODEL ?? DEFAULT_MODEL;
  const endpoint = `${GEMINI_BASE}/${model}:generateContent`;

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
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) {
      return { ok: false, error: 'AI provider returned empty response', isTransient: false };
    }

    return { ok: true, text };
  } catch {
    // Network-level failures (DNS failure, connection refused, etc.) are transient.
    return { ok: false, error: 'AI adapter error', isTransient: true };
  }
}
