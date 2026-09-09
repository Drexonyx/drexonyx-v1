// DR 0058: Async generation driver — 6-step lifecycle, then HALT.
// DR 0056: Authorized transitions: ProductionJob QUEUED→RUNNING, AiGeneration REQUESTED→RUNNING.
// DR 0064: Audit actor_id = production_job_id, actor_role = 'AGENT'. NULL prohibited.
// DR 0069: retry_count persisted; DB-level guard prevents exceeding max of 2.
// DR 0084: Deterministic model routing — resolveProviderForModel() replaces PROVIDER_MAP.

import { db } from '@/db/index';
import { productionJobs, aiGenerations } from '@/db/schema/production';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { issueServiceToken } from './service-tokens';
import { resolveProviderForModel } from './model-routing';

export type RunDriverResult =
  | { ok: true; providerJobId: string }
  | { ok: false; reason: string };

// Runs the 6-step generation lifecycle for a QUEUED ProductionJob (first attempt).
// Steps: validate → CAS claim QUEUED→RUNNING → dispatch → HALT.
// Webhook/polling handles the result (steps 4-6).
export async function runGenerationDriver(params: {
  productionJobId: string;
  organizationId: string;
}): Promise<RunDriverResult> {
  const { productionJobId, organizationId } = params;

  // Step 1: Validate — load ProductionJob, verify QUEUED + AI_GENERATION type
  const jobRows = await db
    .select({
      id: productionJobs.id,
      status: productionJobs.status,
      job_type: productionJobs.job_type,
      organization_id: productionJobs.organization_id,
    })
    .from(productionJobs)
    .where(
      and(
        eq(productionJobs.id, productionJobId),
        eq(productionJobs.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (jobRows.length === 0) return { ok: false, reason: 'ProductionJob not found' };
  const job = jobRows[0];

  // MANUAL_UPLOAD jobs are excluded from the runtime driver (DR 0058)
  if (job.job_type !== 'AI_GENERATION') {
    return { ok: false, reason: 'ProductionJob is not AI_GENERATION type' };
  }
  if (job.status !== 'QUEUED') {
    return { ok: false, reason: `ProductionJob is not QUEUED (current: ${job.status})` };
  }

  // Load the AiGeneration in REQUESTED state
  const genRows = await db
    .select({
      id: aiGenerations.id,
      provider: aiGenerations.provider,
      model: aiGenerations.model,
      prompt: aiGenerations.prompt,
      params: aiGenerations.params,
      status: aiGenerations.status,
      retry_count: aiGenerations.retry_count,
    })
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.production_job_id, productionJobId),
        eq(aiGenerations.organization_id, organizationId),
        eq(aiGenerations.status, 'REQUESTED'),
      ),
    )
    .limit(1);

  if (genRows.length === 0) {
    return { ok: false, reason: 'No REQUESTED AiGeneration found for this job' };
  }

  const gen = genRows[0];

  if (!gen.provider) return { ok: false, reason: 'AiGeneration has no provider set' };
  if (!gen.model) return { ok: false, reason: 'AiGeneration has no model set' };
  if (!gen.prompt) return { ok: false, reason: 'AiGeneration has no prompt set' };

  // DR 0084: Deterministic model routing — fails closed for unknown (provider, model) combinations.
  const route = resolveProviderForModel(gen.provider!, gen.model!);
  if (!route) return { ok: false, reason: `No approved route for provider=${gen.provider} model=${gen.model}` };
  const provider = route.provider;

  // Issue scoped service token for this job (DR 0065)
  const tokenResult = await issueServiceToken({ organizationId, productionJobId });
  if (!tokenResult.ok) return { ok: false, reason: `Token issuance failed: ${tokenResult.reason}` };
  // rawToken is held in-memory for this execution only — never stored or logged.
  const _rawToken = tokenResult.rawToken; // eslint-disable-line @typescript-eslint/no-unused-vars

  // Step 2: CAS claim — ProductionJob QUEUED→RUNNING (atomic, DR 0056 transition #1)
  const idempKey = `PRODUCTION_JOB_RUNNING:${productionJobId}`;
  let aiGenerationId: string;

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'PRODUCTION_JOB_RUNNING',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      const claimed = await tx
        .update(productionJobs)
        .set({ status: 'RUNNING', updated_at: new Date() })
        .where(
          and(
            eq(productionJobs.id, productionJobId),
            eq(productionJobs.organization_id, organizationId),
            eq(productionJobs.status, 'QUEUED'),
          ),
        )
        .returning({ id: productionJobs.id });

      if (claimed.length === 0) throw new Error('CONCURRENT_MODIFICATION');

      // DR 0056 transition #2: AiGeneration REQUESTED→RUNNING (set at claim time)
      const genClaimed = await tx
        .update(aiGenerations)
        .set({ status: 'RUNNING', updated_at: new Date() })
        .where(
          and(
            eq(aiGenerations.id, gen.id),
            eq(aiGenerations.organization_id, organizationId),
            eq(aiGenerations.status, 'REQUESTED'),
          ),
        )
        .returning({ id: aiGenerations.id });

      if (genClaimed.length === 0) throw new Error('CONCURRENT_MODIFICATION');
      aiGenerationId = genClaimed[0].id;

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'production_job',
        entity_id: productionJobId,
        actor_id: productionJobId, // DR 0064: actor_id = production_job_id
        actor_role: 'AGENT',
        action: 'PRODUCTION_JOB_RUNNING',
        payload: { production_job_id: productionJobId, organization_id: organizationId },
      });

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'ai_generation',
        entity_id: gen.id,
        actor_id: productionJobId, // DR 0064: actor_id = production_job_id
        actor_role: 'AGENT',
        action: 'AI_GENERATION_RUNNING',
        payload: { ai_generation_id: gen.id, production_job_id: productionJobId, organization_id: organizationId },
      });

      await tx
        .update(idempotencyKeys)
        .set({ status: 'COMPLETED', updated_at: new Date() })
        .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)));
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'CONCURRENT_MODIFICATION') {
      return { ok: false, reason: 'ProductionJob already claimed by another driver instance' };
    }
    throw e;
  }

  // Step 3: Dispatch to provider
  const dispatchResult = await provider.dispatch({
    productionJobId,
    aiGenerationId: aiGenerationId!,
    organizationId,
    provider: gen.provider!,
    model: gen.model!,
    prompt: gen.prompt!,
    params: (gen.params as Record<string, unknown>) ?? {},
    fileKey: (gen.params as { input_file_key?: string } | null)?.input_file_key ?? '',
  });

  if (!dispatchResult.ok) {
    // Dispatch failed — record failure on AiGeneration
    await recordDispatchFailure({
      aiGenerationId: aiGenerationId!,
      productionJobId,
      organizationId,
      error: dispatchResult.error,
      isTransient: dispatchResult.isTransient,
    });
    return { ok: false, reason: `Dispatch failed: ${dispatchResult.error}` };
  }

  // Store provider_job_id on AiGeneration (DR 0068 §2.3: set at same time as REQUESTED→RUNNING,
  // but RUNNING was already set in the CAS above — update provider_job_id immediately post-dispatch)
  await db
    .update(aiGenerations)
    .set({ provider_job_id: dispatchResult.providerJobId, updated_at: new Date() })
    .where(
      and(
        eq(aiGenerations.id, aiGenerationId!),
        eq(aiGenerations.organization_id, organizationId),
      ),
    );

  // Step 6: HALT — ProductionJob stays RUNNING; webhook/polling continues the flow.
  return { ok: true, providerJobId: dispatchResult.providerJobId };
}

// Records a dispatch-time failure on an AiGeneration.
async function recordDispatchFailure(params: {
  aiGenerationId: string;
  productionJobId: string;
  organizationId: string;
  error: string;
  isTransient: boolean;
}): Promise<void> {
  const { aiGenerationId, productionJobId, organizationId, error, isTransient } = params;

  await db
    .update(aiGenerations)
    .set({ status: 'FAILED', updated_at: new Date() })
    .where(
      and(
        eq(aiGenerations.id, aiGenerationId),
        eq(aiGenerations.organization_id, organizationId),
        eq(aiGenerations.status, 'RUNNING'),
      ),
    );

  await db.insert(auditEvents).values({
    id: uuidv7(),
    organization_id: organizationId,
    entity_type: 'ai_generation',
    entity_id: aiGenerationId,
    actor_id: productionJobId,
    actor_role: 'AGENT',
    action: 'AI_GENERATION_FAILED',
    payload: { ai_generation_id: aiGenerationId, production_job_id: productionJobId, error, is_transient: isTransient },
  });
}

export type RetryDispatchResult =
  | { ok: true; providerJobId: string; newAiGenerationId: string }
  | { ok: false; reason: string };

// Creates a new AiGeneration record and re-dispatches for a transient failure retry.
// ProductionJob is already RUNNING. DR 0069 §2.3 guard applied before creating the new record.
export async function retryDispatch(params: {
  previousAiGenerationId: string;
  productionJobId: string;
  organizationId: string;
}): Promise<RetryDispatchResult> {
  const { previousAiGenerationId, productionJobId, organizationId } = params;

  // DR 0069 §2.3: Atomic guard — verify previous attempt has retry_count < 2
  const prevRows = await db
    .select({
      id: aiGenerations.id,
      provider: aiGenerations.provider,
      model: aiGenerations.model,
      prompt: aiGenerations.prompt,
      params: aiGenerations.params,
      retry_count: aiGenerations.retry_count,
    })
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.id, previousAiGenerationId),
        eq(aiGenerations.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (prevRows.length === 0) return { ok: false, reason: 'Previous AiGeneration not found' };
  const prev = prevRows[0];

  if (prev.retry_count >= 2) {
    return { ok: false, reason: 'Maximum retry count reached (retry_count = 2)' };
  }

  const newGenerationId = uuidv7();
  const newRetryCount = prev.retry_count + 1;

  // Create new AiGeneration with incremented retry_count, then dispatch
  await db.insert(aiGenerations).values({
    id: newGenerationId,
    production_job_id: productionJobId,
    organization_id: organizationId,
    provider: prev.provider,
    model: prev.model,
    prompt: prev.prompt,
    params: prev.params as Record<string, unknown>,
    retry_count: newRetryCount,
    status: 'REQUESTED',
  });

  await db.insert(auditEvents).values({
    id: uuidv7(),
    organization_id: organizationId,
    entity_type: 'ai_generation',
    entity_id: newGenerationId,
    actor_id: productionJobId,
    actor_role: 'AGENT',
    action: 'AI_GENERATION_RETRY',
    payload: {
      new_ai_generation_id: newGenerationId,
      previous_ai_generation_id: previousAiGenerationId,
      retry_count: newRetryCount,
      production_job_id: productionJobId,
    },
  });

  // DR 0084: Deterministic model routing — use approved route for retry dispatch.
  const route = resolveProviderForModel(prev.provider ?? '', prev.model ?? '');
  if (!route) return { ok: false, reason: `No approved route for provider=${prev.provider} model=${prev.model}` };
  const provider = route.provider;

  await db
    .update(aiGenerations)
    .set({ status: 'RUNNING', updated_at: new Date() })
    .where(
      and(
        eq(aiGenerations.id, newGenerationId),
        eq(aiGenerations.organization_id, organizationId),
        eq(aiGenerations.status, 'REQUESTED'),
      ),
    );

  const dispatchResult = await provider.dispatch({
    productionJobId,
    aiGenerationId: newGenerationId,
    organizationId,
    provider: prev.provider!,
    model: prev.model!,
    prompt: prev.prompt!,
    params: (prev.params as Record<string, unknown>) ?? {},
    fileKey: (prev.params as { input_file_key?: string } | null)?.input_file_key ?? '',
  });

  if (!dispatchResult.ok) {
    await recordDispatchFailure({
      aiGenerationId: newGenerationId,
      productionJobId,
      organizationId,
      error: dispatchResult.error,
      isTransient: dispatchResult.isTransient,
    });
    return { ok: false, reason: `Retry dispatch failed: ${dispatchResult.error}` };
  }

  await db
    .update(aiGenerations)
    .set({ provider_job_id: dispatchResult.providerJobId, updated_at: new Date() })
    .where(
      and(
        eq(aiGenerations.id, newGenerationId),
        eq(aiGenerations.organization_id, organizationId),
      ),
    );

  return { ok: true, providerJobId: dispatchResult.providerJobId, newAiGenerationId: newGenerationId };
}
