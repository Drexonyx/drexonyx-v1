// DR 0057: Higgsfield provider adapter (V1 AI generation provider).
// Credentials are server-side only — never exposed to browser or client.
// Webhook signature verification uses HMAC-SHA256 with the configured secret.

import { createHmac, timingSafeEqual } from 'crypto';
import type { AiProvider, DispatchParams, DispatchResult, ParsedWebhookPayload } from './interface';

function getApiKey(): string {
  const key = process.env.HIGGSFIELD_API_KEY;
  if (!key) throw new Error('HIGGSFIELD_API_KEY environment variable is not set');
  return key;
}

function getApiBaseUrl(): string {
  const url = process.env.HIGGSFIELD_API_BASE_URL;
  if (!url) throw new Error('HIGGSFIELD_API_BASE_URL environment variable is not set');
  return url.replace(/\/$/, '');
}

function getWebhookSecret(): string {
  const secret = process.env.HIGGSFIELD_WEBHOOK_SECRET;
  if (!secret) throw new Error('HIGGSFIELD_WEBHOOK_SECRET environment variable is not set');
  return secret;
}

// Higgsfield job-status values mapped to domain model outcomes.
// These string values must be validated against Higgsfield contract during BUILD.
const SUCCEEDED_STATUSES = new Set(['completed', 'succeeded', 'done']);
const TRANSIENT_FAILED_STATUSES = new Set(['timeout', 'rate_limited', 'server_error', 'unavailable']);

interface HiggsFieldDispatchResponse {
  job_id?: string;
  id?: string;
  error?: string;
  message?: string;
  retryable?: boolean;
}

interface HiggsFieldWebhookPayload {
  job_id?: string;
  id?: string;
  status?: string;
  output_url?: string;
  result_url?: string;
  error?: string;
  message?: string;
  retryable?: boolean;
}

export interface PollStatusResult {
  status: 'SUCCEEDED' | 'FAILED' | 'RUNNING';
  resultUrl?: string;
  error?: string;
}

export class HiggsFieldProvider implements AiProvider {
  readonly name = 'higgsfield';

  async dispatch(params: DispatchParams): Promise<DispatchResult> {
    const { aiGenerationId, model, prompt, params: genParams, fileKey } = params;

    let response: Response;
    try {
      response = await fetch(`${getApiBaseUrl()}/v1/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiKey()}`,
          'X-Request-Id': aiGenerationId,
        },
        body: JSON.stringify({
          model,
          prompt,
          file_key: fileKey,
          ...genParams,
        }),
      });
    } catch (err) {
      // Network-level failures are transient
      return { ok: false, error: String(err), isTransient: true };
    }

    let body: HiggsFieldDispatchResponse;
    try {
      body = (await response.json()) as HiggsFieldDispatchResponse;
    } catch {
      return { ok: false, error: `Invalid JSON response (HTTP ${response.status})`, isTransient: response.status >= 500 };
    }

    if (!response.ok) {
      const isTransient = response.status >= 500 || response.status === 429;
      const error = body.error ?? body.message ?? `HTTP ${response.status}`;
      return { ok: false, error, isTransient };
    }

    const providerJobId = body.job_id ?? body.id;
    if (!providerJobId) {
      return { ok: false, error: 'Provider did not return a job identifier', isTransient: false };
    }

    return { ok: true, providerJobId };
  }

  // DR 0077 §2.2: Bounded polling recovery — Higgsfield-specific, not on AiProvider interface.
  async pollJobStatus(params: { providerJobId: string }): Promise<PollStatusResult | null> {
    let response: Response;
    try {
      response = await fetch(`${getApiBaseUrl()}/v1/generate/${params.providerJobId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${getApiKey()}` },
      });
    } catch {
      return null;
    }

    let body: HiggsFieldWebhookPayload;
    try {
      body = (await response.json()) as HiggsFieldWebhookPayload;
    } catch {
      return null;
    }

    if (!response.ok || !body.status) return null;

    const status = body.status.toLowerCase();

    if (SUCCEEDED_STATUSES.has(status)) {
      const resultUrl = body.output_url ?? body.result_url;
      return {
        status: 'SUCCEEDED',
        resultUrl: typeof resultUrl === 'string' ? resultUrl : undefined,
      };
    }

    if (TRANSIENT_FAILED_STATUSES.has(status) || body.retryable === true) {
      return { status: 'FAILED', error: body.error ?? body.message ?? status };
    }

    if (['failed', 'error', 'cancelled'].includes(status)) {
      return { status: 'FAILED', error: body.error ?? body.message ?? status };
    }

    return { status: 'RUNNING' };
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const secret = getWebhookSecret();
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const expectedBuf = Buffer.from(expected, 'utf8');
    const signatureBuf = Buffer.from(signature, 'utf8');
    if (expectedBuf.length !== signatureBuf.length) return false;
    return timingSafeEqual(expectedBuf, signatureBuf);
  }

  parseWebhookPayload(rawPayload: unknown): ParsedWebhookPayload | null {
    if (typeof rawPayload !== 'object' || rawPayload === null) return null;
    const p = rawPayload as HiggsFieldWebhookPayload;

    const providerJobId = p.job_id ?? p.id;
    if (!providerJobId || typeof providerJobId !== 'string') return null;

    const statusRaw = p.status;
    if (!statusRaw || typeof statusRaw !== 'string') return null;

    const status = statusRaw.toLowerCase();

    if (SUCCEEDED_STATUSES.has(status)) {
      const resultUrl = p.output_url ?? p.result_url;
      return {
        provider: this.name,
        providerJobId,
        status: 'SUCCEEDED',
        resultUrl: typeof resultUrl === 'string' ? resultUrl : undefined,
      };
    }

    const isTransient = TRANSIENT_FAILED_STATUSES.has(status) || p.retryable === true;
    return {
      provider: this.name,
      providerJobId,
      status: 'FAILED',
      isTransient,
      error: p.error ?? p.message ?? status,
    };
  }
}

export const higgsFieldProvider = new HiggsFieldProvider();
