// DR 0087: Manual Upload → READY_FOR_QC transition and MANUAL_UPLOAD job completion.
// markManualAssetReadyForQc: UPLOADED → READY_FOR_QC for MANUAL_UPLOAD assets only.
// completeManualUploadJob: QUEUED → COMPLETED for MANUAL_UPLOAD ProductionJobs.
// organizationId always from server-side JWT — never from client input.

import { db } from '@/db/index';
import { assets, productionJobs } from '@/db/schema/production';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, eq, inArray } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { AdminRole } from './types';

const MANUAL_QC_ROLES: AdminRole[] = ['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION'];

export type MarkManualAssetResult =
  | { ok: true; recorded: boolean; reason?: string }
  | { ok: false; reason: string };

export async function markManualAssetReadyForQc(params: {
  assetId: string;
  organizationId: string;
  actorId: string;
  actorRole: AdminRole;
}): Promise<MarkManualAssetResult> {
  const { assetId, organizationId, actorId, actorRole } = params;

  if (!MANUAL_QC_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  const assetRows = await db
    .select({ id: assets.id, status: assets.status, order_id: assets.order_id })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.organization_id, organizationId)))
    .limit(1);

  if (assetRows.length === 0) {
    return { ok: false, reason: 'Asset not found' };
  }

  const asset = assetRows[0];

  if (asset.status !== 'UPLOADED') {
    return { ok: false, reason: `Asset must be in UPLOADED status, currently ${asset.status}` };
  }

  // Verify a MANUAL_UPLOAD ProductionJob exists for the same order (Gap G-1 check)
  const jobRows = await db
    .select({ id: productionJobs.id })
    .from(productionJobs)
    .where(
      and(
        eq(productionJobs.order_id, asset.order_id),
        eq(productionJobs.organization_id, organizationId),
        eq(productionJobs.job_type, 'MANUAL_UPLOAD'),
      ),
    )
    .limit(1);

  if (jobRows.length === 0) {
    return { ok: false, reason: 'No MANUAL_UPLOAD ProductionJob found for this asset\'s order' };
  }

  const idempKey = `MANUAL_ASSET_READY_FOR_QC:${assetId}`;

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
    return { ok: true, recorded: false, reason: 'already_recorded' };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'MANUAL_ASSET_READY_FOR_QC',
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
            eq(assets.status, 'UPLOADED'),
          ),
        )
        .returning({ id: assets.id });

      if (updated.length === 0) throw new Error('CONCURRENT_MODIFICATION');

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'asset',
        entity_id: assetId,
        actor_id: actorId,
        actor_role: actorRole,
        action: 'ASSET_READY_FOR_QC',
        payload: {
          job_type: 'MANUAL_UPLOAD',
          previous_status: 'UPLOADED',
          asset_id: assetId,
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
    if (e instanceof Error && e.message === 'CONCURRENT_MODIFICATION') {
      return { ok: false, reason: 'Asset was concurrently modified' };
    }
    throw e;
  }

  return { ok: true, recorded: true };
}

export type CompleteManualJobResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function completeManualUploadJob(params: {
  productionJobId: string;
  organizationId: string;
  actorId: string;
  actorRole: AdminRole;
}): Promise<CompleteManualJobResult> {
  const { productionJobId, organizationId, actorId, actorRole } = params;

  if (!MANUAL_QC_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  const idempKey = `MANUAL_JOB_COMPLETED:${productionJobId}`;

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
    .select({ id: productionJobs.id, status: productionJobs.status, order_id: productionJobs.order_id, job_type: productionJobs.job_type })
    .from(productionJobs)
    .where(
      and(
        eq(productionJobs.id, productionJobId),
        eq(productionJobs.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (jobRows.length === 0) {
    return { ok: false, reason: 'ProductionJob not found' };
  }

  const job = jobRows[0];

  if (job.job_type !== 'MANUAL_UPLOAD') {
    return { ok: false, reason: 'ProductionJob is not a MANUAL_UPLOAD job' };
  }

  if (job.status === 'COMPLETED') {
    return { ok: true };
  }

  if (job.status !== 'QUEUED') {
    return { ok: false, reason: `ProductionJob must be in QUEUED status, currently ${job.status}` };
  }

  // Verify at least one asset for this order has reached READY_FOR_QC or beyond
  const qualifiedAssets = await db
    .select({ id: assets.id })
    .from(assets)
    .where(
      and(
        eq(assets.order_id, job.order_id),
        eq(assets.organization_id, organizationId),
        inArray(assets.status, ['READY_FOR_QC', 'CLIENT_PREVIEW', 'REVISION_REQUIRED', 'REJECTED']),
      ),
    )
    .limit(1);

  if (qualifiedAssets.length === 0) {
    return { ok: false, reason: 'No asset for this order has reached READY_FOR_QC status yet' };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'MANUAL_JOB_COMPLETED',
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
            eq(productionJobs.status, 'QUEUED'),
          ),
        )
        .returning({ id: productionJobs.id });

      if (updated.length === 0) throw new Error('CONCURRENT_MODIFICATION');

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'production_job',
        entity_id: productionJobId,
        actor_id: actorId,
        actor_role: actorRole,
        action: 'PRODUCTION_JOB_COMPLETED',
        payload: {
          job_type: 'MANUAL_UPLOAD',
          trigger: 'ASSET_READY_FOR_QC',
          production_job_id: productionJobId,
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
    if (e instanceof Error && e.message === 'CONCURRENT_MODIFICATION') {
      return { ok: true };
    }
    throw e;
  }

  return { ok: true };
}
