// DR 0057: Higgsfield provider adapter (V1 AI generation provider).
// Credentials are server-side only — never exposed to browser or client.
// DR 0077: Partially verified against official contract. Remaining items flagged below.

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

// DR 0077 §2.3: Terminal status strings. PARTIALLY VERIFIED.
// 'completed' confirmed as SUCCEEDED terminal status.
// All other values require external verification against current Higgsfield webhook docs.
const SUCCEEDED_STATUSES = new Set(['completed', 'succeeded', 'done']);
const TRANSIENT_FAILED_STATUSES = new Set(['timeout', 'rate_limited', 'server_error', 'unavailable']);

// DR 0077 §2.1: Dispatch response shape.
// VERIFIED: response contains request_id (providerJobId) and status_url.
// UNVERIFIED: other field names; authentication header scheme.
interface HiggsFieldDispatchResponse {
  request_id?: string; // VERIFIED: canonical job correlation identifier
  status_url?: string; // VERIFIED: polling URL for bounded recovery
  job_id?: string;     // legacy fallback — kept for safety during verification period
  id?: string;         // legacy fallback — kept for safety during verification period
  error?: string;
  message?: string;
  retryable?: boolean;
}

// DR 0077 §2.2: Polling response shape. PARTIALLY VERIFIED.
interface HiggsFieldStatusResponse {
  status?: string;
  output_url?: string;  // ⚠️ REQUIRES EXTERNAL VERIFICATION
  result_url?: string;  // ⚠️ REQUIRES EXTERNAL VERIFICATION
  error?: string;
  message?: string;
  retryable?: boolean;
}

// DR 0077 §2.4: Webhook payload shape. PARTIALLY VERIFIED.
interface HiggsFieldWebhookPayload {
  request_id?: string; // VERIFIED: canonical correlation identifier
  job_id?: string;     // legacy fallback
  id?: string;         // legacy fallback
  status?: string;     // ⚠️ terminal values require external verification
  output_url?: string; // ⚠️ REQUIRES EXTERNAL VERIFICATION
  result_url?: string; // ⚠️ REQUIRES EXTERNAL VERIFICATION
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

    // DR 0077 §2.1: Model-specific asynchronous endpoint. VERIFIED: endpoints are model-specific.
    // ⚠️ PARTIALLY VERIFIED: exact path pattern requires external verification.
    // Using /{model} suffix as the best-match for "model-specific asynchronous endpoints".
    let response: Response;
    try {
      response = await fetch(`${getApiBaseUrl()}/v1/generate/${encodeURIComponent(model)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ⚠️ UNVERIFIED: authentication header scheme — Bearer is assumed but not confirmed.
          'Authorization': `Bearer ${getApiKey()}`,
          'X-Request-Id': aiGenerationId,
        },
        body: JSON.stringify({
          prompt,
          file_key: fileKey,
          ...genParams,
        }),
      });
    } catch (err) {
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

    // VERIFIED: response contains request_id; fallback to legacy fields during transition.
    const providerJobId = body.request_id ?? body.job_id ?? body.id;
    if (!providerJobId) {
      return { ok: false, error: 'Provider did not return a job identifier (request_id)', isTransient: false };
    }

    // VERIFIED: response contains status_url for polling recovery.
    // status_url is passed to pollJobStatus when available; stored separately from providerJobId.
    // NOTE: persisting status_url to DB requires either DR 0057 amendment or schema change —
    // both are deferred. Recovery polling falls back to constructed URL.
    if (body.status_url) {
      this._lastStatusUrl = body.status_url;
    }

    return { ok: true, providerJobId };
  }

  // In-memory only — survives only the lifetime of this dispatch call chain.
  // Full status_url persistence requires a schema change (deferred).
  private _lastStatusUrl: string | undefined;

  // DR 0077 §2.2: Bounded polling recovery — Higgsfield-specific, NOT on AiProvider interface.
  // statusUrl: use if available (from dispatch response); falls back to constructed URL.
  // ⚠️ PARTIALLY VERIFIED: constructed polling URL pattern needs external verification.
  async pollJobStatus(params: { providerJobId: string; statusUrl?: string }): Promise<PollStatusResult | null> {
    // Use explicit statusUrl if provided; otherwise construct from providerJobId.
    // ⚠️ Constructed pattern `GET /v1/status/{request_id}` is an assumption — verify.
    const url = params.statusUrl ?? `${getApiBaseUrl()}/v1/status/${params.providerJobId}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${getApiKey()}` },
      });
    } catch {
      return null;
    }

    let body: HiggsFieldStatusResponse;
    try {
      body = (await response.json()) as HiggsFieldStatusResponse;
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
    // DR 0077 §2.5: HMAC-SHA256 constant-time comparison.
    // ⚠️ UNVERIFIED: signature header name (x-higgsfield-signature) and HMAC algorithm
    // need external verification against current Higgsfield webhook documentation.
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

    // VERIFIED: request_id is the canonical correlation field.
    const providerJobId = p.request_id ?? p.job_id ?? p.id;
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
