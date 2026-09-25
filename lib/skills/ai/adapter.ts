// DR 0073 §2.2: Sole location within lib/skills/ where any AI provider SDK or API key is accessed.
// DR 0073 §2.4: Model identifier read from SKILLS_AI_MODEL env var; V1 value = claude-sonnet-4-6.
// DR 0073 §2.5: API key stored exclusively as server-side env var; never logged or returned to callers.
// DR 0073 §2.6: Each skill.execute() makes at most ONE call to callAi().

import Anthropic from '@anthropic-ai/sdk';

export interface AiAdapterRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}

export type AiAdapterResult =
  | { ok: true; text: string }
  | { ok: false; error: string; isTransient: boolean };

// Redact any credential-like values from provider error strings before surfacing them.
function redactCredentials(text: string): string {
  return text
    .replace(/sk-ant-[A-Za-z0-9_-]{10,}/g, '[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]{20,}/gi, 'Bearer [REDACTED]');
}

// Returns a sanitized error message — never the raw API key or full provider error chain.
// Includes err.type and err.message from Anthropic so callers can diagnose the exact cause.
function safeErrorMessage(err: unknown): { message: string; isTransient: boolean } {
  if (err instanceof Anthropic.APIError) {
    // 529 = overloaded; 5xx = server-side transient
    const isTransient = err.status === 529 || err.status >= 500;
    const detail = redactCredentials(err.message ?? '');
    return { message: `AI provider error (status ${err.status}): ${detail}`, isTransient };
  }
  if (err instanceof Error) {
    return { message: 'AI adapter error', isTransient: false };
  }
  return { message: 'AI adapter error', isTransient: false };
}

export async function callAi(request: AiAdapterRequest): Promise<AiAdapterResult> {
  const model = process.env.SKILLS_AI_MODEL;
  if (!model) {
    return { ok: false, error: 'SKILLS_AI_MODEL is not configured', isTransient: false };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'AI provider credentials are not configured', isTransient: false };
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model,
      max_tokens: request.maxTokens ?? 2048,
      system: request.systemPrompt,
      messages: [{ role: 'user', content: request.userPrompt }],
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return { ok: true, text };
  } catch (err) {
    const { message, isTransient } = safeErrorMessage(err);
    return { ok: false, error: message, isTransient };
  }
}
