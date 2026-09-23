// Automated production pipeline orchestrator.
// Runs deterministic QC checks after an asset reaches READY_FOR_QC,
// creates a PENDING Approval on PASS, creates a revision job on FAIL,
// and triggers delivery after client APPROVED decision.
// organizationId always from server-side JWT — never from client input.

import { db } from '@/db/index';
import { assets, qcReviews, approvals } from '@/db/schema/production';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, count, eq, isNull, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { createManualUploadAsset } from './manual-upload';
import { createRevisionJob } from './revisions';
import { createDelivery, sendDelivery } from './deliveries';
import type { AdminRole } from './types';

// Sentinel UUID for pipeline-automated audit events. No FK on actor_id so any UUID is valid.
const PIPELINE_ACTOR_ID = '00000000-0000-0000-0000-000000000000';
const PIPELINE_ACTOR_ROLE: AdminRole = 'OWNER';

// Maximum revision cycles per order before the asset is REJECTED.
export const MAX_REVISION_COUNT = 3;

// ─── QC Checks ───────────────────────────────────────────────────────────────

type QcCheckResult = { pass: true } | { pass: false; reason: string };

export function performQcChecks(asset: {
  archived_at: Date | null;
  file_key: string | null;
  file_type: string | null;
  file_size: number | null;
}): QcCheckResult {
  if (asset.archived_at !== null) {
    return { pass: false, reason: 'asset_archived' };
  }

  // AUTOMATED_QC_REQUIRE_FILE defaults to true. Set to 'false' to skip file checks in dev.
  const requireFile = process.env.AUTOMATED_QC_REQUIRE_FILE !== 'false';
  if (requireFile) {
    if (!asset.file_key) {
      return { pass: false, reason: 'missing_file_key' };
    }
    if (!asset.file_type) {
      return { pass: false, reason: 'missing_file_type' };
    }
    if (!asset.file_size || asset.file_size <= 0) {
      return { pass: false, reason: 'invalid_file_size' };
    }
  }

  return { pass: true };
}

// ─── Core QC + Pipeline Runner ───────────────────────────────────────────────

export type RunAutomatedQcResult =
  | { ok: true; verdict: 'PASS'; reviewId: string; approvalId: string }
  | { ok: true; verdict: 'FAIL'; reviewId: string; revisionJobId?: string; exhausted?: boolean }
  | { ok: false; reason: string };

export async function runAutomatedQcAndPipeline(params: {
  assetId: string;
  organizationId: string;
}): Promise<RunAutomatedQcResult> {
  const { assetId, organizationId } = params;

  const assetRows = await db
    .select({
      id: assets.id,
      status: assets.status,
      order_id: assets.order_id,
      archived_at: assets.archived_at,
      file_key: assets.file_key,
      file_type: assets.file_type,
      file_size: assets.file_size,
    })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.organization_id, organizationId)))
    .limit(1);

  if (assetRows.length === 0) {
    return { ok: false, reason: 'Asset not found' };
  }

  const asset = assetRows[0];

  if (asset.status !== 'READY_FOR_QC') {
    return { ok: false, reason: `Asset must be READY_FOR_QC, currently ${asset.status}` };
  }

  const orderId = asset.order_id;
  const qcCheck = performQcChecks(asset);
  const verdict = qcCheck.pass ? 'PASS' : 'FAIL';
  const nextStatus = verdict === 'PASS' ? 'CLIENT_PREVIEW' : 'REVISION_REQUIRED';
  const auditAction = verdict === 'PASS' ? 'ASSET_CLIENT_PREVIEW' : 'ASSET_REVISION_REQUIRED';
  const failReason = !qcCheck.pass ? (qcCheck as { pass: false; reason: string }).reason : null;

  const reviewId = uuidv7();
  const idempKey = `AUTOMATED_QC_REVIEW:${assetId}`;

  const existingIdemp = await db
    .select({ status: idempotencyKeys.status, response_payload: idempotencyKeys.response_payload })
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)))
    .limit(1);

  if (existingIdemp.length > 0 && existingIdemp[0].status === 'COMPLETED') {
    const p = existingIdemp[0].response_payload as { reviewId: string; verdict: string; approvalId?: string };
    if (p.verdict === 'PASS' && p.approvalId) {
      return { ok: true, verdict: 'PASS', reviewId: p.reviewId, approvalId: p.approvalId };
    }
    return { ok: true, verdict: 'FAIL', reviewId: p.reviewId };
  }

  let committedVerdict = verdict;
  let committedReviewId = reviewId;

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'AUTOMATED_QC_REVIEW',
          status: 'PROCESSING',
          response_payload: { reviewId, verdict },
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      const keyRow = await tx
        .select({ status: idempotencyKeys.status, response_payload: idempotencyKeys.response_payload })
        .from(idempotencyKeys)
        .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)))
        .limit(1);

      if (keyRow.length > 0 && keyRow[0].status === 'COMPLETED') {
        const p = keyRow[0].response_payload as { reviewId: string; verdict: string };
        const err = new Error('ALREADY_COMPLETED') as Error & { reviewId: string; verdict: string };
        err.reviewId = p.reviewId;
        err.verdict = p.verdict;
        throw err;
      }

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

      // reviewer_id: null — automated QC has no user actor (FK prevents non-null non-user UUID)
      await tx.insert(qcReviews).values({
        id: reviewId,
        asset_id: assetId,
        organization_id: organizationId,
        reviewer_id: null,
        verdict,
        notes: qcCheck.pass ? 'Automated QC: all checks passed' : `Automated QC failed: ${failReason}`,
      });

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'asset',
        entity_id: assetId,
        actor_id: PIPELINE_ACTOR_ID,
        actor_role: PIPELINE_ACTOR_ROLE,
        action: auditAction,
        payload: {
          asset_id: assetId,
          review_id: reviewId,
          verdict,
          automated: true,
          fail_reason: failReason,
          organization_id: organizationId,
        },
      });

      await tx
        .update(idempotencyKeys)
        .set({ status: 'COMPLETED', updated_at: new Date() })
        .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)));
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'ALREADY_COMPLETED') {
      const err = e as Error & { reviewId: string; verdict: string };
      committedVerdict = err.verdict;
      committedReviewId = err.reviewId;
    } else if (e instanceof Error && e.message === 'ASSET_NOT_READY_FOR_QC') {
      return { ok: false, reason: 'Asset is no longer in READY_FOR_QC status' };
    } else {
      throw e;
    }
  }

  if (committedVerdict === 'PASS') {
    const approvalResult = await createAssetApprovalForPipeline({ assetId, orderId, organizationId });
    if (!approvalResult.ok) {
      console.error(`[automatedPipeline] Approval creation failed for asset ${assetId}: ${approvalResult.reason}`);
      return { ok: true, verdict: 'PASS', reviewId: committedReviewId, approvalId: '' };
    }

    // Update idempotency payload with approvalId for future idempotent returns
    await db
      .update(idempotencyKeys)
      .set({ response_payload: { reviewId: committedReviewId, verdict: 'PASS', approvalId: approvalResult.approvalId }, updated_at: new Date() })
      .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)));

    return { ok: true, verdict: 'PASS', reviewId: committedReviewId, approvalId: approvalResult.approvalId };
  }

  // FAIL path: check revision count then create revision job
  const revisionCount = await countRevisionInitiatedEvents(orderId, organizationId);

  if (revisionCount >= MAX_REVISION_COUNT) {
    await recordRevisionExhausted({ assetId, orderId, organizationId, reviewId: committedReviewId });
    return { ok: true, verdict: 'FAIL', reviewId: committedReviewId, exhausted: true };
  }

  const revisionResult = await createRevisionJob({
    originalAssetId: assetId,
    orderId,
    organizationId,
    jobType: 'MANUAL_UPLOAD',
    description: `Auto-revision ${revisionCount + 1} after QC FAIL: ${failReason}`,
    actorId: PIPELINE_ACTOR_ID,
    actorRole: PIPELINE_ACTOR_ROLE,
  });

  if (!revisionResult.ok) {
    console.error(`[automatedPipeline] Revision job creation failed for asset ${assetId}: ${revisionResult.reason}`);
    return { ok: true, verdict: 'FAIL', reviewId: committedReviewId };
  }

  const revisionAssetResult = await createManualUploadAsset({
    productionJobId: revisionResult.newProductionJobId,
    organizationId,
    actorId: PIPELINE_ACTOR_ID,
    actorRole: PIPELINE_ACTOR_ROLE,
  });

  if (!revisionAssetResult.ok) {
    console.error(`[automatedPipeline] Revision asset creation failed: ${revisionAssetResult.reason}`);
  }

  return { ok: true, verdict: 'FAIL', reviewId: committedReviewId, revisionJobId: revisionResult.newProductionJobId };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function countRevisionInitiatedEvents(orderId: string, organizationId: string): Promise<number> {
  const rows = await db
    .select({ total: count() })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.organization_id, organizationId),
        eq(auditEvents.action, 'REVISION_INITIATED'),
        sql`${auditEvents.payload}->>'order_id' = ${orderId}`,
      ),
    )
    .limit(1);
  return rows[0]?.total ?? 0;
}

async function recordRevisionExhausted(params: {
  assetId: string;
  orderId: string;
  organizationId: string;
  reviewId: string;
}): Promise<void> {
  const { assetId, orderId, organizationId, reviewId } = params;

  await db
    .update(assets)
    .set({ status: 'REJECTED', updated_at: new Date() })
    .where(
      and(
        eq(assets.id, assetId),
        eq(assets.organization_id, organizationId),
        eq(assets.status, 'REVISION_REQUIRED'),
      ),
    );

  await db.insert(auditEvents).values({
    id: uuidv7(),
    organization_id: organizationId,
    entity_type: 'asset',
    entity_id: assetId,
    actor_id: PIPELINE_ACTOR_ID,
    actor_role: PIPELINE_ACTOR_ROLE,
    action: 'PIPELINE_REVISION_EXHAUSTED',
    payload: {
      asset_id: assetId,
      order_id: orderId,
      review_id: reviewId,
      max_revisions: MAX_REVISION_COUNT,
      organization_id: organizationId,
    },
  });
}

// ─── Asset Approval Creation ──────────────────────────────────────────────────

export type CreateAssetApprovalResult =
  | { ok: true; approvalId: string }
  | { ok: false; reason: string };

export async function createAssetApprovalForPipeline(params: {
  assetId: string;
  orderId: string;
  organizationId: string;
}): Promise<CreateAssetApprovalResult> {
  const { assetId, orderId, organizationId } = params;

  const idempKey = `ASSET_APPROVAL_CREATED:${assetId}`;

  const existing = await db
    .select({ status: idempotencyKeys.status, response_payload: idempotencyKeys.response_payload })
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)))
    .limit(1);

  if (existing.length > 0 && existing[0].status === 'COMPLETED') {
    const payload = existing[0].response_payload as { approvalId: string };
    return { ok: true, approvalId: payload.approvalId };
  }

  const approvalId = uuidv7();

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'ASSET_APPROVAL_CREATED',
          status: 'PROCESSING',
          response_payload: { approvalId },
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      const keyRow = await tx
        .select({ status: idempotencyKeys.status, response_payload: idempotencyKeys.response_payload })
        .from(idempotencyKeys)
        .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)))
        .limit(1);

      if (keyRow.length > 0 && keyRow[0].status === 'COMPLETED') {
        const p = keyRow[0].response_payload as { approvalId: string };
        const err = new Error('ALREADY_COMPLETED') as Error & { approvalId: string };
        err.approvalId = p.approvalId;
        throw err;
      }

      await tx.insert(approvals).values({
        id: approvalId,
        order_id: orderId,
        organization_id: organizationId,
        target_type: 'ASSET',
        target_id: assetId,
        status: 'PENDING',
        created_by_user_id: null,
      });

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'approval',
        entity_id: approvalId,
        actor_id: PIPELINE_ACTOR_ID,
        actor_role: PIPELINE_ACTOR_ROLE,
        action: 'APPROVAL_CREATED',
        payload: {
          approval_id: approvalId,
          asset_id: assetId,
          order_id: orderId,
          automated: true,
          organization_id: organizationId,
        },
      });

      await tx
        .update(idempotencyKeys)
        .set({ status: 'COMPLETED', updated_at: new Date() })
        .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)));
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'ALREADY_COMPLETED') {
      return { ok: true, approvalId: (e as Error & { approvalId: string }).approvalId };
    }
    throw e;
  }

  return { ok: true, approvalId };
}

// ─── Post-Approval Delivery Trigger ──────────────────────────────────────────

export type OnClientApprovalResult =
  | { ok: true; deliveryId: string }
  | { ok: false; reason: string };

export async function onClientApproval(params: {
  orderId: string;
  organizationId: string;
}): Promise<OnClientApprovalResult> {
  const { orderId, organizationId } = params;

  const idempKey = `PIPELINE_DELIVERY:${orderId}`;

  const existing = await db
    .select({ status: idempotencyKeys.status, response_payload: idempotencyKeys.response_payload })
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.key, idempKey), eq(idempotencyKeys.organization_id, organizationId)))
    .limit(1);

  if (existing.length > 0 && existing[0].status === 'COMPLETED') {
    const payload = existing[0].response_payload as { deliveryId: string };
    return { ok: true, deliveryId: payload.deliveryId };
  }

  const clientPreviewAssets = await db
    .select({ id: assets.id })
    .from(assets)
    .where(
      and(
        eq(assets.order_id, orderId),
        eq(assets.organization_id, organizationId),
        eq(assets.status, 'CLIENT_PREVIEW'),
        isNull(assets.archived_at),
      ),
    );

  if (clientPreviewAssets.length === 0) {
    return { ok: false, reason: 'No CLIENT_PREVIEW assets found for this order' };
  }

  const assetIds = clientPreviewAssets.map((a) => a.id);

  const deliveryResult = await createDelivery({
    orderId,
    organizationId,
    assetIds,
    actorId: PIPELINE_ACTOR_ID,
    actorRole: PIPELINE_ACTOR_ROLE,
  });

  if (!deliveryResult.ok) {
    return { ok: false, reason: deliveryResult.reason };
  }

  const deliveryId = deliveryResult.deliveryId;

  await db
    .insert(idempotencyKeys)
    .values({
      id: uuidv7(),
      key: idempKey,
      organization_id: organizationId,
      operation_type: 'PIPELINE_DELIVERY',
      status: 'COMPLETED',
      response_payload: { deliveryId },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    .onConflictDoNothing();

  const sendResult = await sendDelivery({
    deliveryId,
    organizationId,
    actorId: PIPELINE_ACTOR_ID,
    actorRole: PIPELINE_ACTOR_ROLE,
  });

  if (!sendResult.ok) {
    console.error(`[automatedPipeline] sendDelivery failed for ${deliveryId}: ${sendResult.reason}`);
  }

  return { ok: true, deliveryId };
}
