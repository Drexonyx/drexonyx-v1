// DR 0077 §2.2: Bounded polling recovery for Higgsfield. NOT on the AiProvider interface.
// Webhook is the primary completion mechanism. Polling is bounded recovery only.
// Maximum POLL_MAX_ATTEMPTS polls with POLL_INTERVAL_MS between each.

import { db } from '@/db/index';
import { aiGenerations } from '@/db/schema/production';
import { and, eq } from 'drizzle-orm';
import { higgsFieldProvider } from './providers/higgsfield';
import { materializeGenerationAsset } from './materialization';
import { failProductionJob, attemptProductionJobCompletion } from './terminal';
import { runAutomatedQcAndPipeline } from '@/lib/admin/automated-pipeline';

const POLL_MAX_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 10_000;

export type PollResult =
  | { ok: true; done: boolean; status: string }
  | { ok: false; error: string };

// Polls Higgsfield for a single AiGeneration's status and processes the result.
// Returns done=true if the generation reached a terminal state during this call.
export async function pollGenerationStatus(params: {
  aiGenerationId: string;
  productionJobId: string;
  organizationId: string;
}): Promise<PollResult> {
  const { aiGenerationId, productionJobId, organizationId } = params;

  const genRows = await db
    .select({
      provider: aiGenerations.provider,
      provider_job_id: aiGenerations.provider_job_id,
      status: aiGenerations.status,
    })
    .from(aiGenerations)
    .where(and(eq(aiGenerations.id, aiGenerationId), eq(aiGenerations.organization_id, organizationId)))
    .limit(1);

  if (genRows.length === 0) {
    return { ok: false, error: `AiGeneration not found: ${aiGenerationId}` };
  }

  const gen = genRows[0];

  if (gen.status !== 'RUNNING') {
    return { ok: true, done: true, status: gen.status };
  }

  if (!gen.provider || !gen.provider_job_id) {
    return { ok: false, error: 'AiGeneration missing provider or provider_job_id' };
  }

  // VERIFIED: status URL is derivable from providerJobId — /requests/{id}/status.
  // No status_url column in ai_generations; constructed URL is authoritative.
  const pollResult = await higgsFieldProvider.pollJobStatus({
    providerJobId: gen.provider_job_id,
  });

  if (!pollResult) {
    return { ok: false, error: 'Provider returned no status' };
  }

  if (pollResult.status === 'SUCCEEDED') {
    const matResult = await materializeGenerationAsset({
      aiGenerationId,
      productionJobId,
      organizationId,
      provider: gen.provider,
      resultUrl: pollResult.resultUrl,
    });

    if (matResult.ok) {
      await attemptProductionJobCompletion({ productionJobId, organizationId });
      // Trigger automated QC — non-fatal; asset status is already committed.
      const qcResult = await runAutomatedQcAndPipeline({ assetId: matResult.assetId, organizationId });
      if (!qcResult.ok) {
        console.error(`[polling] runAutomatedQcAndPipeline failed for asset ${matResult.assetId}: ${qcResult.reason}`);
      }
    }

    return { ok: true, done: true, status: 'SUCCEEDED' };
  }

  if (pollResult.status === 'FAILED') {
    await failProductionJob({
      productionJobId,
      organizationId,
      reason: pollResult.error ?? 'Provider reported failure during polling',
    });
    return { ok: true, done: true, status: 'FAILED' };
  }

  return { ok: true, done: false, status: 'RUNNING' };
}

// Bounded polling loop: up to POLL_MAX_ATTEMPTS, with POLL_INTERVAL_MS delay.
// Returns when a terminal state is reached or attempts are exhausted.
export async function boundedPollUntilTerminal(params: {
  aiGenerationId: string;
  productionJobId: string;
  organizationId: string;
  maxAttempts?: number;
  intervalMs?: number;
}): Promise<PollResult> {
  const {
    aiGenerationId,
    productionJobId,
    organizationId,
    maxAttempts = POLL_MAX_ATTEMPTS,
    intervalMs = POLL_INTERVAL_MS,
  } = params;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    const result = await pollGenerationStatus({ aiGenerationId, productionJobId, organizationId });

    if (!result.ok || result.done) {
      return result;
    }
  }

  return { ok: false, error: `Polling exhausted after ${maxAttempts} attempts` };
}
