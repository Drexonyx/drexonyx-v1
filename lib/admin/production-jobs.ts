// DR 0053: ProductionJob creation and cancellation.
// organizationId always from server-side JWT — never from client input.
// Idempotent via system.idempotency_keys.
// AGENT is excluded from all ProductionJob mutations (DR 0053 §5, D11).

import { db } from '@/db/index';
import { productionJobs, aiGenerations } from '@/db/schema/production';
import { orders } from '@/db/schema/commercial';
import { payments } from '@/db/schema/financial';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { AdminRole } from './types';

const CREATE_ROLES: AdminRole[] = ['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION'];
const CANCEL_ROLES: AdminRole[] = ['OWNER', 'ADMIN_OPERATIONS'];

// Extracts the Drizzle transaction type from db.transaction's callback parameter.
// Used by callers that must include ProductionJob creation in their own outer transaction.
type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// DR 0088 §2.4: Internal helper — inserts ProductionJob + related rows inside a caller-managed
// transaction. Caller is responsible for validation (order exists, ACTIVE) and idempotency.
export async function insertProductionJobInTx(
  tx: DbTx,
  params: {
    jobId: string;
    orderId: string;
    organizationId: string;
    jobType: 'AI_GENERATION' | 'MANUAL_UPLOAD';
    description?: string;
    metadata?: Record<string, unknown>;
    actorId: string;
    actorRole: AdminRole;
    aiGenerationParams?: {
      provider?: string | null;
      model?: string | null;
      prompt?: string | null;
      params?: Record<string, unknown> | null;
    };
  },
): Promise<void> {
  const { jobId, orderId, organizationId, jobType, description, metadata, actorId, actorRole, aiGenerationParams } = params;

  await tx.insert(productionJobs).values({
    id: jobId,
    order_id: orderId,
    organization_id: organizationId,
    job_type: jobType,
    description: description ?? null,
    metadata: metadata ?? null,
    status: 'QUEUED',
  });

  if (jobType === 'AI_GENERATION') {
    await tx.insert(aiGenerations).values({
      id: uuidv7(),
      production_job_id: jobId,
      organization_id: organizationId,
      status: 'REQUESTED',
      provider: aiGenerationParams?.provider ?? null,
      model: aiGenerationParams?.model ?? null,
      prompt: aiGenerationParams?.prompt ?? null,
      params: aiGenerationParams?.params ?? null,
    });

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'ai_generation',
      entity_id: jobId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'AI_GENERATION_REQUESTED',
      payload: { production_job_id: jobId, organization_id: organizationId },
    });
  }

  await tx.insert(auditEvents).values({
    id: uuidv7(),
    organization_id: organizationId,
    entity_type: 'production_job',
    entity_id: jobId,
    actor_id: actorId,
    actor_role: actorRole,
    action: 'PRODUCTION_JOB_CREATED',
    payload: { job_id: jobId, order_id: orderId, job_type: jobType, organization_id: organizationId },
  });
}

export type CreateProductionJobResult =
  | { ok: true; jobId: string }
  | { ok: false; reason: string };

export async function createProductionJob(params: {
  orderId: string;
  organizationId: string;
  jobType: 'AI_GENERATION' | 'MANUAL_UPLOAD';
  description?: string;
  metadata?: Record<string, unknown>;
  actorId: string;
  actorRole: AdminRole;
  aiGenerationParams?: {
    provider?: string | null;
    model?: string | null;
    prompt?: string | null;
    params?: Record<string, unknown> | null;
  };
}): Promise<CreateProductionJobResult> {
  const { orderId, organizationId, jobType, description, metadata, actorId, actorRole, aiGenerationParams } = params;

  if (!CREATE_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  // Verify Order exists and belongs to org (must be ACTIVE)
  const orderRows = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.organization_id, organizationId),
        isNull(orders.archived_at),
      ),
    )
    .limit(1);

  if (orderRows.length === 0) {
    return { ok: false, reason: 'Order not found' };
  }
  if (orderRows[0].status !== 'ACTIVE') {
    return { ok: false, reason: `Cannot create ProductionJob for Order in ${orderRows[0].status} status` };
  }

  // DR 0053 §2.7: Production must not start without confirmed payment.
  const paidPayments = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.order_id, orderId),
        eq(payments.status, 'PAID'),
      ),
    )
    .limit(1);

  if (paidPayments.length === 0) {
    return { ok: false, reason: 'Cannot start production: no confirmed payment on record for this order.' };
  }

  const jobId = uuidv7();
  const idempKey = `PRODUCTION_JOB_CREATED:${jobId}`;

  await db.transaction(async (tx) => {
    await tx
      .insert(idempotencyKeys)
      .values({
        id: uuidv7(),
        key: idempKey,
        organization_id: organizationId,
        operation_type: 'PRODUCTION_JOB_CREATED',
        status: 'PROCESSING',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .onConflictDoNothing();

    await tx.insert(productionJobs).values({
      id: jobId,
      order_id: orderId,
      organization_id: organizationId,
      job_type: jobType,
      description: description ?? null,
      metadata: metadata ?? null,
      status: 'QUEUED',
    });

    // DR 0053 §2.5: For AI_GENERATION jobs, create an AiGeneration record in REQUESTED state
    if (jobType === 'AI_GENERATION') {
      await tx.insert(aiGenerations).values({
        id: uuidv7(),
        production_job_id: jobId,
        organization_id: organizationId,
        status: 'REQUESTED',
        provider: aiGenerationParams?.provider ?? null,
        model: aiGenerationParams?.model ?? null,
        prompt: aiGenerationParams?.prompt ?? null,
        params: aiGenerationParams?.params ?? null,
      });

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'ai_generation',
        entity_id: jobId,
        actor_id: actorId,
        actor_role: actorRole,
        action: 'AI_GENERATION_REQUESTED',
        payload: { production_job_id: jobId, organization_id: organizationId },
      });
    }

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'production_job',
      entity_id: jobId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'PRODUCTION_JOB_CREATED',
      payload: {
        job_id: jobId,
        order_id: orderId,
        job_type: jobType,
        organization_id: organizationId,
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

  return { ok: true, jobId };
}

export type CancelProductionJobResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function cancelProductionJob(params: {
  jobId: string;
  organizationId: string;
  actorId: string;
  actorRole: AdminRole;
}): Promise<CancelProductionJobResult> {
  const { jobId, organizationId, actorId, actorRole } = params;

  if (!CANCEL_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  const idempKey = `PRODUCTION_JOB_CANCELLED:${jobId}`;

  const existing = await db
    .select({ status: idempotencyKeys.status })
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.key, idempKey),
        eq(idempotencyKeys.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (existing.length > 0 && existing[0].status === 'COMPLETED') {
    return { ok: true };
  }

  const jobRows = await db
    .select({ id: productionJobs.id, status: productionJobs.status })
    .from(productionJobs)
    .where(
      and(
        eq(productionJobs.id, jobId),
        eq(productionJobs.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (jobRows.length === 0) {
    return { ok: false, reason: 'ProductionJob not found' };
  }

  const job = jobRows[0];

  if (job.status === 'CANCELLED') return { ok: true };
  if (job.status === 'COMPLETED' || job.status === 'FAILED') {
    return { ok: false, reason: 'ProductionJob is already in terminal state' };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'PRODUCTION_JOB_CANCELLED',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      const updated = await tx
        .update(productionJobs)
        .set({ status: 'CANCELLED', updated_at: new Date() })
        .where(
          and(
            eq(productionJobs.id, jobId),
            eq(productionJobs.organization_id, organizationId),
            eq(productionJobs.status, job.status),
          ),
        )
        .returning({ id: productionJobs.id });

      if (updated.length === 0) throw new Error('CONCURRENT_MODIFICATION');

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'production_job',
        entity_id: jobId,
        actor_id: actorId,
        actor_role: actorRole,
        action: 'PRODUCTION_JOB_CANCELLED',
        payload: { job_id: jobId, organization_id: organizationId },
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
    if (e instanceof Error && e.message === 'CONCURRENT_MODIFICATION') {
      return { ok: true };
    }
    throw e;
  }

  return { ok: true };
}
