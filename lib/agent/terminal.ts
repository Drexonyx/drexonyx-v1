// DR 0063: ProductionJob terminal transition authority.
// RUNNING→COMPLETED: all AiGenerations SUCCEEDED + all linked Assets READY_FOR_QC.
// RUNNING→FAILED: unrecoverable failure or retry exhaustion.
// RUNNING→CANCELLED: NOT authorized in Phase 09.
// Condition verification and CAS are in the same atomic transaction.

import { db } from '@/db/index';
import { productionJobs, aiGenerations, assets, assetAiGenerations } from '@/db/schema/production';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, eq, ne } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { revokeServiceTokensForJob } from './service-tokens';

export type TerminalTransitionResult =
  | { ok: true; transitioned: boolean }
  | { ok: false; reason: string };

// Attempts RUNNING→COMPLETED if all conditions are met (DR 0063 §2.2).
// Returns transitioned=false if conditions not yet met — not an error.
export async function attemptProductionJobCompletion(params: {
  productionJobId: string;
  organizationId: string;
}): Promise<TerminalTransitionResult> {
  const { productionJobId, organizationId } = params;

  const idempKey = `PRODUCTION_JOB_COMPLETED:${productionJobId}`;

  // Fast-path idempotency check
  const existingIdemp = await db
    .select({ status: idempotencyKeys.status })
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)))
    .limit(1);

  if (existingIdemp.length > 0 && existingIdemp[0].status === 'COMPLETED') {
    return { ok: true, transitioned: true };
  }

  try {
    let transitioned = false;

    await db.transaction(async (tx) => {
      // DR 0063 §2.2 C1: all non-cancelled AiGenerations for this job must be SUCCEEDED
      const genRows = await tx
        .select({ id: aiGenerations.id, status: aiGenerations.status })
        .from(aiGenerations)
        .where(
          and(
            eq(aiGenerations.production_job_id, productionJobId),
            eq(aiGenerations.organization_id, organizationId),
            ne(aiGenerations.status, 'CANCELLED'),
          ),
        )
        .limit(1000);

      if (genRows.length === 0) return; // No generations — conditions not met
      const allGenSucceeded = genRows.every((g) => g.status === 'SUCCEEDED');
      if (!allGenSucceeded) return;

      // DR 0063 §2.2 C2: all linked Assets must be READY_FOR_QC
      const assetRows = await tx
        .select({ id: assets.id, status: assets.status })
        .from(assets)
        .innerJoin(
          assetAiGenerations,
          and(
            eq(assetAiGenerations.asset_id, assets.id),
            eq(assetAiGenerations.organization_id, assets.organization_id),
          ),
        )
        .innerJoin(
          aiGenerations,
          and(
            eq(aiGenerations.id, assetAiGenerations.ai_generation_id),
            eq(aiGenerations.organization_id, assetAiGenerations.organization_id),
          ),
        )
        .where(
          and(
            eq(aiGenerations.production_job_id, productionJobId),
            eq(aiGenerations.organization_id, organizationId),
          ),
        )
        .limit(1000);

      // If assets exist, all must be READY_FOR_QC
      if (assetRows.length > 0) {
        const allAssetsReady = assetRows.every((a) => a.status === 'READY_FOR_QC');
        if (!allAssetsReady) return;
      }

      // All conditions met — insert idempotency key then CAS
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'PRODUCTION_JOB_COMPLETED',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      const updated = await tx
        .update(productionJobs)
        .set({ status: 'COMPLETED', updated_at: new Date() })
        .where(
          and(
            eq(productionJobs.id, productionJobId),
            eq(productionJobs.organization_id, organizationId),
            eq(productionJobs.status, 'RUNNING'),
          ),
        )
        .returning({ id: productionJobs.id });

      if (updated.length === 0) throw new Error('CONCURRENT_MODIFICATION');

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'production_job',
        entity_id: productionJobId,
        actor_id: productionJobId, // DR 0064: actor_id = production_job_id
        actor_role: 'AGENT',
        action: 'PRODUCTION_JOB_COMPLETED',
        payload: { production_job_id: productionJobId, organization_id: organizationId },
      });

      await tx
        .update(idempotencyKeys)
        .set({ status: 'COMPLETED', updated_at: new Date() })
        .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)));

      transitioned = true;
    });

    if (transitioned) {
      // Revoke service tokens when job reaches terminal state (DR 0065 §2.8)
      await revokeServiceTokensForJob({ productionJobId, organizationId });
    }

    return { ok: true, transitioned };
  } catch (e) {
    if (e instanceof Error && e.message === 'CONCURRENT_MODIFICATION') {
      return { ok: true, transitioned: true };
    }
    throw e;
  }
}

// Transitions RUNNING→FAILED. Called when failure is unrecoverable or retries exhausted (DR 0063 §2.3).
export async function failProductionJob(params: {
  productionJobId: string;
  organizationId: string;
  reason: string;
}): Promise<TerminalTransitionResult> {
  const { productionJobId, organizationId, reason } = params;

  const idempKey = `PRODUCTION_JOB_FAILED:${productionJobId}`;

  const existingIdemp = await db
    .select({ status: idempotencyKeys.status })
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)))
    .limit(1);

  if (existingIdemp.length > 0 && existingIdemp[0].status === 'COMPLETED') {
    return { ok: true, transitioned: true };
  }

  try {
    let transitioned = false;

    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'PRODUCTION_JOB_FAILED',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      const updated = await tx
        .update(productionJobs)
        .set({ status: 'FAILED', updated_at: new Date() })
        .where(
          and(
            eq(productionJobs.id, productionJobId),
            eq(productionJobs.organization_id, organizationId),
            eq(productionJobs.status, 'RUNNING'),
          ),
        )
        .returning({ id: productionJobs.id });

      if (updated.length === 0) throw new Error('CONCURRENT_MODIFICATION');

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'production_job',
        entity_id: productionJobId,
        actor_id: productionJobId, // DR 0064: actor_id = production_job_id
        actor_role: 'AGENT',
        action: 'PRODUCTION_JOB_FAILED',
        payload: { production_job_id: productionJobId, organization_id: organizationId, reason },
      });

      await tx
        .update(idempotencyKeys)
        .set({ status: 'COMPLETED', updated_at: new Date() })
        .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)));

      transitioned = true;
    });

    if (transitioned) {
      await revokeServiceTokensForJob({ productionJobId, organizationId });
    }

    return { ok: true, transitioned };
  } catch (e) {
    if (e instanceof Error && e.message === 'CONCURRENT_MODIFICATION') {
      return { ok: true, transitioned: true };
    }
    throw e;
  }
}

// Transitions Asset PROCESSING→READY_FOR_QC (DR 0056 authorized transition #6).
export type AssetTransitionResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function transitionAssetToReadyForQc(params: {
  assetId: string;
  organizationId: string;
  productionJobId: string; // for audit actor identity (DR 0064)
}): Promise<AssetTransitionResult> {
  const { assetId, organizationId, productionJobId } = params;

  const idempKey = `ASSET_READY_FOR_QC:${assetId}`;

  const existingIdemp = await db
    .select({ status: idempotencyKeys.status })
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)))
    .limit(1);

  if (existingIdemp.length > 0 && existingIdemp[0].status === 'COMPLETED') {
    return { ok: true };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'ASSET_READY_FOR_QC',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      const updated = await tx
        .update(assets)
        .set({ status: 'READY_FOR_QC', updated_at: new Date() })
        .where(
          and(
            eq(assets.id, assetId),
            eq(assets.organization_id, organizationId),
            eq(assets.status, 'PROCESSING'),
          ),
        )
        .returning({ id: assets.id });

      if (updated.length === 0) throw new Error('CONCURRENT_MODIFICATION');

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'asset',
        entity_id: assetId,
        actor_id: productionJobId, // DR 0064: actor_id = production_job_id
        actor_role: 'AGENT',
        action: 'ASSET_READY_FOR_QC',
        payload: { asset_id: assetId, production_job_id: productionJobId, organization_id: organizationId },
      });

      await tx
        .update(idempotencyKeys)
        .set({ status: 'COMPLETED', updated_at: new Date() })
        .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)));
    });

    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === 'CONCURRENT_MODIFICATION') {
      return { ok: true };
    }
    throw e;
  }
}
