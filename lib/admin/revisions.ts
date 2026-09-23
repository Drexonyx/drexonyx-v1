// DR 0088: Controlled Revision Job Initiation.
// createRevisionJob: creates a new ProductionJob for a REVISION_REQUIRED asset.
// DR 0088 §2.4: idempotency key REVISION_INITIATED:{originalAssetId} prevents duplicate jobs
// from retries or concurrent requests. The key, job creation, and audit event are covered by
// a single atomic transaction. A concurrent winner is detected inside the transaction by
// re-reading the key under PostgreSQL's uniqueness row-lock, which blocks the loser until
// the winner commits, then reveals COMPLETED status.
// The original REVISION_REQUIRED asset row is terminal and is not modified.
// Lineage tracking (parent_asset_id) is DEFERRED per DR 0053 §4.2.
// organizationId always from server-side JWT — never from client input.

import { db } from '@/db/index';
import { assets } from '@/db/schema/production';
import { orders } from '@/db/schema/commercial';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { insertProductionJobInTx } from './production-jobs';
import type { AdminRole } from './types';

const REVISION_ROLES: AdminRole[] = ['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION'];

export type CreateRevisionJobResult =
  | { ok: true; newProductionJobId: string }
  | { ok: false; reason: string };

export async function createRevisionJob(params: {
  originalAssetId: string;
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
}): Promise<CreateRevisionJobResult> {
  const { originalAssetId, orderId, organizationId, jobType, description, metadata, actorId, actorRole, aiGenerationParams } = params;

  if (!REVISION_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  // Verify original asset exists, is REVISION_REQUIRED, and belongs to the specified order.
  const assetRows = await db
    .select({ id: assets.id, status: assets.status, order_id: assets.order_id })
    .from(assets)
    .where(
      and(
        eq(assets.id, originalAssetId),
        eq(assets.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (assetRows.length === 0) {
    return { ok: false, reason: 'Original asset not found' };
  }

  const originalAsset = assetRows[0];

  if (originalAsset.status !== 'REVISION_REQUIRED') {
    return { ok: false, reason: `Original asset must be in REVISION_REQUIRED status, currently ${originalAsset.status}` };
  }

  if (originalAsset.order_id !== orderId) {
    return { ok: false, reason: 'Asset does not belong to the specified order' };
  }

  // Validate the order directly — replicates createProductionJob's validation so we can
  // include job creation inside our own transaction (createProductionJob uses db.transaction
  // internally and cannot be nested inside an outer transaction in postgres-js).
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

  // DR 0088 §2.4: idempotency key scoped to the original asset within the organization.
  const idempKey = `REVISION_INITIATED:${originalAssetId}`;

  // Fast-path: if a previous call already completed, return the recorded job ID.
  const existing = await db
    .select({ status: idempotencyKeys.status, response_payload: idempotencyKeys.response_payload })
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.key, idempKey),
        eq(idempotencyKeys.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (existing.length > 0 && existing[0].status === 'COMPLETED') {
    const payload = existing[0].response_payload as { newProductionJobId: string };
    return { ok: true, newProductionJobId: payload.newProductionJobId };
  }

  // Pre-generate job ID so it can be stored atomically in the idempotency record before
  // the ProductionJob row is created. This enables idempotent recovery on any retry.
  const newJobId = uuidv7();

  try {
    await db.transaction(async (tx) => {
      // Claim the idempotency slot. ON CONFLICT DO NOTHING silently loses the race if another
      // transaction already inserted this key. PostgreSQL's uniqueness check acquires a row lock
      // on the existing row, causing this transaction to block until the holder commits or
      // rolls back, ensuring we see the committed outcome in the re-read below.
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'REVISION_INITIATED',
          status: 'PROCESSING',
          response_payload: { newProductionJobId: newJobId },
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      // Re-read within the transaction (READ COMMITTED sees the winner's committed state).
      // If COMPLETED, a concurrent request already finished — return its job ID.
      const keyRow = await tx
        .select({ status: idempotencyKeys.status, response_payload: idempotencyKeys.response_payload })
        .from(idempotencyKeys)
        .where(
          and(
            eq(idempotencyKeys.key, idempKey),
            eq(idempotencyKeys.organization_id, organizationId),
          ),
        )
        .limit(1);

      if (keyRow.length > 0 && keyRow[0].status === 'COMPLETED') {
        const payload = keyRow[0].response_payload as { newProductionJobId: string };
        const err = new Error('ALREADY_COMPLETED') as Error & { jobId: string };
        err.jobId = payload.newProductionJobId;
        throw err;
      }

      // Atomically create the ProductionJob and all related rows inside this transaction.
      await insertProductionJobInTx(tx, {
        jobId: newJobId,
        orderId,
        organizationId,
        jobType,
        description,
        metadata,
        actorId,
        actorRole,
        aiGenerationParams,
      });

      // The only record linking the original REVISION_REQUIRED asset to the new job.
      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'production_job',
        entity_id: newJobId,
        actor_id: actorId,
        actor_role: actorRole,
        action: 'REVISION_INITIATED',
        payload: {
          original_asset_id: originalAssetId,
          new_production_job_id: newJobId,
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
  } catch (e) {
    if (e instanceof Error && e.message === 'ALREADY_COMPLETED') {
      return { ok: true, newProductionJobId: (e as Error & { jobId: string }).jobId };
    }
    throw e;
  }

  return { ok: true, newProductionJobId: newJobId };
}
