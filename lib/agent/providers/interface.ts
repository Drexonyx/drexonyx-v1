// DR 0057: Provider-agnostic interface for AI generation providers.
// Higgsfield is the V1 provider. Naming is generic throughout the domain model.

export interface DispatchParams {
  productionJobId: string;
  aiGenerationId: string;
  organizationId: string;
  provider: string;
  model: string;
  prompt: string;
  params: Record<string, unknown>;
  fileKey: string; // mandatory per DR 0057 §2.4
}

export type DispatchResult =
  | { ok: true; providerJobId: string }
  | { ok: false; error: string; isTransient: boolean };

export interface ParsedWebhookPayload {
  provider: string;
  providerJobId: string;
  status: 'SUCCEEDED' | 'FAILED';
  isTransient?: boolean; // for FAILED: whether this is a retryable transient failure
  resultUrl?: string;    // for SUCCEEDED
  error?: string;        // for FAILED
}

export interface AiProvider {
  readonly name: string;
  dispatch(params: DispatchParams): Promise<DispatchResult>;
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;
  parseWebhookPayload(rawPayload: unknown): ParsedWebhookPayload | null;
}
