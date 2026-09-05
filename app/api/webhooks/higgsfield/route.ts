// DR 0059: Provider webhook callback handler — Higgsfield.
// Signature verification is mandatory before any mutation.
// Idempotency via system.idempotency_keys. CAS on AiGeneration prevents races.
// DR 0061: Transient failures trigger retry (retry_count < 2); permanent failures → job FAILED.
// DR 0064: actor_id = production_job_id, actor_role = 'AGENT'.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { aiGenerations } from '@/db/schema/production';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { higgsFieldProvider } from '@/lib/agent/providers/higgsfield';
import { retryDispatch } from '@/lib/agent/driver';
import { attemptProductionJobCompletion, failProductionJob } from '@/lib/agent/terminal';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Read raw body before any parsing — required for HMAC signature verification
  const rawBody = Buffer.from(await request.arrayBuffer());

  // DR 0059 §2.3: Signature verification is mandatory before any mutation
  const signature = request.headers.get('x-higgsfield-signature') ?? '';
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  if (!higgsFieldProvider.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = higgsFieldProvider.parseWebhookPayload(rawPayload);
  if (!parsed) {
    return NextResponse.json({ error: 'Unrecognized payload shape' }, { status: 400 });
  }

  const { provider, providerJobId, status, isTransient, resultUrl, error: providerError } = parsed;

  // DR 0059 §2.4: Correlate via (provider, provider_job_id)
  const genRows = await db
    .select({
      id: aiGenerations.id,
      production_job_id: aiGenerations.production_job_id,
      organization_id: aiGenerations.organization_id,
      status: aiGenerations.status,
      retry_count: aiGenerations.retry_count,
    })
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.provider, provider),
        eq(aiGenerations.provider_job_id, providerJobId),
      ),
    )
    .limit(1);

  if (genRows.length === 0) {
    // Unknown correlation — acknowledge to prevent retries from provider
    return NextResponse.json({ received: true });
  }

  const gen = genRows[0];
  const { production_job_id: productionJobId, organization_id: organizationId } = gen;

  // DR 0059 §2.5: Tenant isolation — org validated after lookup
  // organization_id comes from the matched row, never from webhook payload.

  // Idempotency: one outcome per (ai_generation_id, status) pair (DR 0048 pattern, DR 0059)
  const idempKey = `AI_GEN_WEBHOOK:${gen.id}:${status}`;

  const existingIdemp = await db
    .select({ status: idempotencyKeys.status })
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.key, idempKey),
        eq(idempotencyKeys.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (existingIdemp.length > 0 && existingIdemp[0].status === 'COMPLETED') {
    return NextResponse.json({ received: true });
  }

  if (status === 'SUCCEEDED') {
    await handleSuccess({
      gen,
      productionJobId,
      organizationId,
      idempKey,
      resultUrl,
    });
  } else {
    await handleFailure({
      gen,
      productionJobId,
      organizationId,
      idempKey,
      isTransient: isTransient ?? false,
      providerError: providerError ?? 'Unknown provider error',
    });
  }

  return NextResponse.json({ received: true });
}

async function handleSuccess(params: {
  gen: { id: string; status: string; retry_count: number };
  productionJobId: string;
  organizationId: string;
  idempKey: string;
  resultUrl?: string;
}) {
  const { gen, productionJobId, organizationId, idempKey, resultUrl } = params;

  if (gen.status !== 'RUNNING') return; // Already transitioned

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'AI_GEN_WEBHOOK_SUCCEEDED',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      // DR 0056 transition #3: AiGeneration RUNNING→SUCCEEDED (CAS)
      const updated = await tx
        .update(aiGenerations)
        .set({ status: 'SUCCEEDED', result_url: resultUrl ?? null, updated_at: new Date() })
        .where(
          and(
            eq(aiGenerations.id, gen.id),
            eq(aiGenerations.organization_id, organizationId),
            eq(aiGenerations.status, 'RUNNING'),
          ),
        )
        .returning({ id: aiGenerations.id });

      if (updated.length === 0) throw new Error('CONCURRENT_MODIFICATION');

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'ai_generation',
        entity_id: gen.id,
        actor_id: productionJobId, // DR 0064
        actor_role: 'AGENT',
        action: 'AI_GENERATION_SUCCEEDED',
        payload: { ai_generation_id: gen.id, production_job_id: productionJobId, result_url: resultUrl ?? null },
      });

      await tx
        .update(idempotencyKeys)
        .set({ status: 'COMPLETED', updated_at: new Date() })
        .where(
          and(
            eq(idempotencyKeys.key, idempKey),
            eq(idempotencyKeys.organization_id, organizationId),
          ),
        );
    });

    // Check if ProductionJob can now complete (DR 0063 §2.2)
    await attemptProductionJobCompletion({ productionJobId, organizationId });
  } catch (e) {
    if (e instanceof Error && e.message === 'CONCURRENT_MODIFICATION') return;
    throw e;
  }
}

async function handleFailure(params: {
  gen: { id: string; status: string; retry_count: number };
  productionJobId: string;
  organizationId: string;
  idempKey: string;
  isTransient: boolean;
  providerError: string;
}) {
  const { gen, productionJobId, organizationId, idempKey, isTransient, providerError } = params;

  if (gen.status !== 'RUNNING') return;

  // DR 0061 §2.2: Permanent failures do NOT increment retry_count.
  // DR 0061 §2.3: Only transient failures trigger retry (up to retry_count < 2).
  const isRetryEligible = isTransient && gen.retry_count < 2;

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'AI_GEN_WEBHOOK_FAILED',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      // DR 0056 transition #4: AiGeneration RUNNING→FAILED (CAS)
      const updated = await tx
        .update(aiGenerations)
        .set({ status: 'FAILED', updated_at: new Date() })
        .where(
          and(
            eq(aiGenerations.id, gen.id),
            eq(aiGenerations.organization_id, organizationId),
            eq(aiGenerations.status, 'RUNNING'),
          ),
        )
        .returning({ id: aiGenerations.id });

      if (updated.length === 0) throw new Error('CONCURRENT_MODIFICATION');

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'ai_generation',
        entity_id: gen.id,
        actor_id: productionJobId, // DR 0064
        actor_role: 'AGENT',
        action: 'AI_GENERATION_FAILED',
        payload: {
          ai_generation_id: gen.id,
          production_job_id: productionJobId,
          error: providerError,
          is_transient: isTransient,
          retry_count: gen.retry_count,
          retry_eligible: isRetryEligible,
        },
      });

      await tx
        .update(idempotencyKeys)
        .set({ status: 'COMPLETED', updated_at: new Date() })
        .where(
          and(
            eq(idempotencyKeys.key, idempKey),
            eq(idempotencyKeys.organization_id, organizationId),
          ),
        );
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'CONCURRENT_MODIFICATION') return;
    throw e;
  }

  if (isRetryEligible) {
    // DR 0061 §2.1: Transient failure within retry budget — create new AiGeneration and re-dispatch
    await retryDispatch({
      previousAiGenerationId: gen.id,
      productionJobId,
      organizationId,
    });
  } else {
    // Permanent failure or retry exhaustion → ProductionJob RUNNING→FAILED (DR 0063 §2.3)
    await failProductionJob({
      productionJobId,
      organizationId,
      reason: isTransient ? `Retry exhausted (retry_count=${gen.retry_count}): ${providerError}` : `Permanent failure: ${providerError}`,
    });
  }
}
