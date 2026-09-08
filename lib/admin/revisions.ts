// DR 0088: Controlled Revision Job Initiation.
// createRevisionJob: creates a new ProductionJob for a REVISION_REQUIRED asset.
// The original REVISION_REQUIRED asset row is terminal and is not modified.
// Lineage tracking (parent_asset_id) is DEFERRED per DR 0053 §4.2.
// organizationId always from server-side JWT — never from client input.

import { db } from '@/db/index';
import { assets } from '@/db/schema/production';
import { auditEvents } from '@/db/schema/system';
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { createProductionJob } from './production-jobs';
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
}): Promise<CreateRevisionJobResult> {
  const { originalAssetId, orderId, organizationId, jobType, description, metadata, actorId, actorRole } = params;

  if (!REVISION_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  // Verify original asset exists, is REVISION_REQUIRED, and belongs to the specified order
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

  // Create new ProductionJob via existing function (reuses all its validation)
  const jobResult = await createProductionJob({
    orderId,
    organizationId,
    jobType,
    description,
    metadata,
    actorId,
    actorRole,
  });

  if (!jobResult.ok) {
    return { ok: false, reason: jobResult.reason };
  }

  const newProductionJobId = jobResult.jobId;

  // Write REVISION_INITIATED audit event — the only record linking original asset to new job
  await db.insert(auditEvents).values({
    id: uuidv7(),
    organization_id: organizationId,
    entity_type: 'production_job',
    entity_id: newProductionJobId,
    actor_id: actorId,
    actor_role: actorRole,
    action: 'REVISION_INITIATED',
    payload: {
      original_asset_id: originalAssetId,
      new_production_job_id: newProductionJobId,
      order_id: orderId,
      job_type: jobType,
      organization_id: organizationId,
    },
  });

  return { ok: true, newProductionJobId };
}
