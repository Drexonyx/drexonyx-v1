// DR 0057: Higgsfield provider adapter (V1 AI generation provider).
// Credentials are server-side only — never exposed to browser or client.
// DR 0077: Contract repair — evidence-based corrections applied per Phase 11 repair task.

import { createHmac, timingSafeEqual } from 'crypto';
import type { AiProvider, DispatchParams, DispatchResult, ParsedWebhookPayload } from './interface';
import { getObject } from '@/lib/infrastructure/object-storage';

// ─── Credential helpers ───────────────────────────────────────────────────────

// VERIFIED: Authorization: Key {ID}:{SECRET} scheme (from official Higgsfield SDK / docs).
function getApiKeyId(): string {
  const v = process.env.HIGGSFIELD_API_KEY_ID;
  if (!v) throw new Error('HIGGSFIELD_API_KEY_ID environment variable is not set');
  return v;
}

function getApiKeySecret(): string {
  const v = process.env.HIGGSFIELD_API_KEY_SECRET;
  if (!v) throw new Error('HIGGSFIELD_API_KEY_SECRET environment variable is not set');
  return v;
}

function authHeader(): string {
  return `Key ${getApiKeyId()}:${getApiKeySecret()}`;
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

// ─── Model → endpoint mapping ─────────────────────────────────────────────────
// Fail closed: only explicitly mapped models are supported.
// Models are operator-supplied strings; unknown values throw rather than guess.
// Sources: official Higgsfield SDK types.ts (confirmed model-specific async endpoints).
const MODEL_ENDPOINT_MAP: Record<string, string> = {
  'text2image/soul': '/v1/text2image/soul',
  'image2video/dop': '/v1/image2video/dop',
  'speak/higgsfield': '/v1/speak/higgsfield',
};

function getModelEndpoint(model: string): string {
  const path = MODEL_ENDPOINT_MAP[model];
  if (!path) {
    throw new Error(
      `Higgsfield model not supported: "${model}". Supported models: ${Object.keys(MODEL_ENDPOINT_MAP).join(', ')}`,
    );
  }
  return path;
}

// ─── Status constants ─────────────────────────────────────────────────────────
// VERIFIED from official Higgsfield SDK V2 types: terminal values are
// 'completed', 'failed', 'nsfw'. Unofficial values ('succeeded', 'done',
// 'timeout', 'rate_limited') have been removed.
const SUCCEEDED_STATUSES = new Set(['completed']);
// 'nsfw' is terminal-failed with no retry.
const NSFW_STATUS = 'nsfw';
// 'server_error' / 'unavailable' retained as transient-failure indicators
// per evidence; remaining unconfirmed values removed.
const TRANSIENT_FAILED_STATUSES = new Set(['server_error', 'unavailable']);

// ─── Response shapes ──────────────────────────────────────────────────────────

// VERIFIED (official SDK V2 types.ts): dispatch response contains
// request_id, status, status_url, cancel_url.
interface HiggsFieldDispatchResponse {
  request_id?: string;
  status?: string;
  status_url?: string;
  cancel_url?: string;
  // Legacy fallback fields kept during transition period.
  job_id?: string;
  id?: string;
  error?: string;
  message?: string;
  retryable?: boolean;
}

// VERIFIED (official SDK V2 types.ts): output shape uses
// video?: { url } and images?: [{ url }][] — NOT output_url / result_url.
interface V2Output {
  video?: { url?: string };
  images?: Array<{ url?: string }>;
}

interface HiggsFieldStatusResponse extends V2Output {
  status?: string;
  error?: string;
  message?: string;
  retryable?: boolean;
}

// VERIFIED (official SDK V2): webhook V2 output uses same video/images shape.
interface HiggsFieldWebhookPayload extends V2Output {
  request_id?: string;
  job_id?: string;
  id?: string;
  status?: string;
  error?: string;
  message?: string;
  retryable?: boolean;
}

// ─── File upload helpers ──────────────────────────────────────────────────────

interface UploadUrlResponse {
  upload_url?: string;
  public_url?: string;
}

// Two-phase Higgsfield file upload:
//   1. POST /files/generate-upload-url → { upload_url, public_url }
//   2. PUT upload_url with file bytes
// Returns public_url for use in generation request body.
async function uploadFileToHiggsfield(fileKey: string, baseUrl: string): Promise<string> {
  const bytes = await getObject(fileKey);

  const uploadUrlRes = await fetch(`${baseUrl}/files/generate-upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': authHeader() },
    body: JSON.stringify({ file_name: fileKey.split('/').pop() ?? fileKey }),
  });
  if (!uploadUrlRes.ok) {
    const text = await uploadUrlRes.text().catch(() => '');
    throw new Error(`Higgsfield upload-url request failed (HTTP ${uploadUrlRes.status}): ${text}`);
  }
  const uploadUrlBody = (await uploadUrlRes.json()) as UploadUrlResponse;
  if (!uploadUrlBody.upload_url || !uploadUrlBody.public_url) {
    throw new Error('Higgsfield upload-url response missing upload_url or public_url');
  }

  const putRes = await fetch(uploadUrlBody.upload_url, {
    method: 'PUT',
    body: new Uint8Array(bytes),
  });
  if (!putRes.ok) {
    throw new Error(`Higgsfield file PUT failed (HTTP ${putRes.status})`);
  }

  return uploadUrlBody.public_url;
}

// ─── Output URL extraction ────────────────────────────────────────────────────

// VERIFIED (official SDK V2 types.ts): output fields are video?.url and images?.[0]?.url.
function extractResultUrl(body: V2Output): string | undefined {
  if (body.video?.url) return body.video.url;
  if (body.images?.[0]?.url) return body.images[0].url;
  return undefined;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export interface PollStatusResult {
  status: 'SUCCEEDED' | 'FAILED' | 'RUNNING';
  resultUrl?: string;
  error?: string;
}

export class HiggsFieldProvider implements AiProvider {
  readonly name = 'higgsfield';

  async dispatch(params: DispatchParams): Promise<DispatchResult> {
    const { aiGenerationId, model, prompt, params: genParams, fileKey } = params;

    const baseUrl = getApiBaseUrl();

    let endpointPath: string;
    try {
      endpointPath = getModelEndpoint(model);
    } catch (err) {
      return { ok: false, error: String(err), isTransient: false };
    }

    // VERIFIED: append ?hf_webhook={url} query param when webhook URL is configured.
    const webhookUrl = process.env.HIGGSFIELD_WEBHOOK_URL;
    const endpointUrl = webhookUrl
      ? `${baseUrl}${endpointPath}?hf_webhook=${encodeURIComponent(webhookUrl)}`
      : `${baseUrl}${endpointPath}`;

    // Build request body. File input: upload R2 asset to Higgsfield first.
    // The field name for the returned public_url is model-specific and UNVERIFIED;
    // we use 'image_url' as the best available evidence from SDK usage.
    // ⚠️ UNVERIFIED: exact field name for uploaded file in request body.
    const requestBody: Record<string, unknown> = { prompt, ...genParams };
    if (fileKey) {
      let publicUrl: string;
      try {
        publicUrl = await uploadFileToHiggsfield(fileKey, baseUrl);
      } catch (err) {
        return { ok: false, error: `File upload failed: ${String(err)}`, isTransient: true };
      }
      requestBody.image_url = publicUrl;
    }

    let response: Response;
    try {
      response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // VERIFIED: Authorization: Key {ID}:{SECRET}
          'Authorization': authHeader(),
          'X-Request-Id': aiGenerationId,
        },
        body: JSON.stringify(requestBody),
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

    // status_url is derivable from providerJobId: /requests/{id}/status
    // No in-memory singleton; no DB persistence needed.
    return { ok: true, providerJobId };
  }

  // DR 0077 §2.2: Bounded polling recovery — Higgsfield-specific, NOT on AiProvider interface.
  // VERIFIED: polling endpoint is /requests/{request_id}/status (official SDK).
  // statusUrl param accepted for forward-compat but constructed URL is used by default.
  async pollJobStatus(params: { providerJobId: string; statusUrl?: string }): Promise<PollStatusResult | null> {
    const baseUrl = getApiBaseUrl();
    // VERIFIED: official status endpoint pattern is /requests/{id}/status.
    const url = params.statusUrl ?? `${baseUrl}/requests/${params.providerJobId}/status`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': authHeader() },
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
      return { status: 'SUCCEEDED', resultUrl: extractResultUrl(body) };
    }

    if (status === NSFW_STATUS) {
      return { status: 'FAILED', error: 'nsfw' };
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
    // DR 0077 §2.5: HMAC-SHA256 constant-time comparison. PRESERVED AS-IS.
    // ⚠️ UNVERIFIED: signature header name (x-higgsfield-signature) and HMAC algorithm.
    // DO NOT modify without authoritative evidence.
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
      // VERIFIED (official SDK V2): extract from video?.url or images?.[0]?.url.
      return {
        provider: this.name,
        providerJobId,
        status: 'SUCCEEDED',
        resultUrl: extractResultUrl(p),
      };
    }

    if (status === NSFW_STATUS) {
      return { provider: this.name, providerJobId, status: 'FAILED', isTransient: false, error: 'nsfw' };
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
