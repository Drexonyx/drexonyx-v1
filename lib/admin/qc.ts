// DR 0006 QC Boundary, Phase 08: QC review submission.
// PASS → CLIENT_PREVIEW; FAIL → REVISION_REQUIRED (Asset state machine).
// reviewer_id attribution required. Only QC, ADMIN_OPERATIONS, OWNER may submit.
// organizationId always from server-side JWT.

import { db } from '@/db/index';
import { assets, qcReviews } from '@/db/schema/production';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { AdminRole } from './types';

const QC_ROLES: AdminRole[] = ['OWNER', 'ADMIN_OPERATIONS', 'QC'];

export type CreateQcReviewResult =
  | { ok: true; reviewId: string }
  | { ok: false; reason: string };

export async function createQcReview(params: {
  assetId: string;
  organizationId: string;
  verdict: 'PASS' | 'FAIL';
  notes?: string;
  actorId: string;
  actorRole: AdminRole;
}): Promise<CreateQcReviewResult> {
  const { assetId, organizationId, verdict, notes, actorId, actorRole } = params;

  if (!QC_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  const assetRows = await db
    .select({ id: assets.id, status: assets.status })
    .from(assets)
    .where(
      and(
        eq(assets.id, assetId),
        eq(assets.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (assetRows.length === 0) {
    return { ok: false, reason: 'Asset not found' };
  }

  const asset = assetRows[0];

  if (asset.status !== 'READY_FOR_QC') {
    return { ok: false, reason: `Asset must be in READY_FOR_QC status, currently ${asset.status}` };
  }

  const nextStatus = verdict === 'PASS' ? 'CLIENT_PREVIEW' : 'REVISION_REQUIRED';
  const auditAction = verdict === 'PASS' ? 'ASSET_CLIENT_PREVIEW' : 'ASSET_REVISION_REQUIRED';
  const reviewId = uuidv7();
  const idempKey = `QC_REVIEW:${assetId}:${reviewId}`;

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'QC_REVIEW',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      const updated = await tx
        .update(assets)
        .set({ status: nextStatus, updated_at: new Date() })
        .where(
          and(
            eq(assets.id, assetId),
            eq(assets.organization_id, organizationId),
            eq(assets.status, 'READY_FOR_QC'),
          ),
        )
        .returning({ id: assets.id });

      if (updated.length === 0) throw new Error('ASSET_NOT_READY_FOR_QC');

      await tx.insert(qcReviews).values({
        id: reviewId,
        asset_id: assetId,
        organization_id: organizationId,
        reviewer_id: actorId,
        verdict,
        notes: notes ?? null,
      });

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'asset',
        entity_id: assetId,
        actor_id: actorId,
        actor_role: actorRole,
        action: auditAction,
        payload: {
          asset_id: assetId,
          review_id: reviewId,
          verdict,
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
    if (e instanceof Error && e.message === 'ASSET_NOT_READY_FOR_QC') {
      return { ok: false, reason: 'Asset is no longer in READY_FOR_QC status' };
    }
    throw e;
  }

  return { ok: true, reviewId };
}
