// DR 0029: CLIENT approval decision (APPROVED or REJECTED).
// Five scope constraints from DR 0029 §2.6 enforced here.
// organizationId always from server-side JWT — never from client input.

import { db } from '@/db/index';
import { approvals } from '@/db/schema/production';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { onClientApproval } from '@/lib/admin/automated-pipeline';

export type DecideApprovalResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function decideApproval(params: {
  approvalId: string;
  organizationId: string;
  decision: 'APPROVED' | 'REJECTED';
  actorId: string;
  actorRole: string;
}): Promise<DecideApprovalResult> {
  const { approvalId, organizationId, decision, actorId, actorRole } = params;

  // DR 0029 §2.6 constraint 1: Only CLIENT role may decide
  if (actorRole !== 'CLIENT') {
    return { ok: false, reason: 'Insufficient authority' };
  }

  const approvalRows = await db
    .select({
      id: approvals.id,
      status: approvals.status,
      target_type: approvals.target_type,
      expires_at: approvals.expires_at,
      order_id: approvals.order_id,
    })
    .from(approvals)
    .where(
      and(
        // DR 0029 §2.6 constraint 2: org-scoped — JWT organizationId only
        eq(approvals.id, approvalId),
        eq(approvals.organization_id, organizationId),
        isNull(approvals.archived_at),
      ),
    )
    .limit(1);

  if (approvalRows.length === 0) {
    return { ok: false, reason: 'Approval not found' };
  }

  const approval = approvalRows[0];

  // DR 0029 §2.6 constraint 3: Approval must be in PENDING status
  if (approval.status !== 'PENDING') {
    return { ok: false, reason: `Approval is not pending (status: ${approval.status})` };
  }

  // DR 0029 §2.6 constraint 4: Approval must not be expired
  if (approval.expires_at && approval.expires_at < new Date()) {
    return { ok: false, reason: 'Approval has expired' };
  }

  // DR 0029 §2.6 constraint 5: CLIENT may only decide ASSET-type Approvals
  if (approval.target_type !== 'ASSET') {
    return { ok: false, reason: 'CLIENT may only decide ASSET-type Approvals' };
  }

  const auditAction =
    decision === 'APPROVED' ? 'APPROVAL_DECIDED_APPROVED' : 'APPROVAL_DECIDED_REJECTED';
  const idempKey = `APPROVAL_DECIDED:${approvalId}`;

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

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'APPROVAL_DECIDED',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      const updated = await tx
        .update(approvals)
        .set({
          status: decision,
          decided_by_user_id: actorId,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(approvals.id, approvalId),
            eq(approvals.organization_id, organizationId),
            eq(approvals.status, 'PENDING'),
          ),
        )
        .returning({ id: approvals.id });

      if (updated.length === 0) throw new Error('CONCURRENT_MODIFICATION');

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'approval',
        entity_id: approvalId,
        actor_id: actorId,
        actor_role: actorRole,
        action: auditAction,
        payload: {
          approval_id: approvalId,
          decision,
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

  // After a successful CLIENT APPROVED decision, attempt to trigger automated delivery.
  // Only fires for ASSET-type approvals (constraint 5 above already enforces this).
  // createDelivery gates on all approvals being APPROVED — safe to call on every APPROVED event.
  // Non-fatal: approval is already committed regardless of delivery outcome.
  if (decision === 'APPROVED') {
    try {
      const deliveryResult = await onClientApproval({ orderId: approval.order_id, organizationId });
      if (!deliveryResult.ok) {
        console.error(`[decideApproval] onClientApproval failed for order ${approval.order_id}: ${deliveryResult.reason}`);
      }
    } catch (err) {
      console.error(`[decideApproval] onClientApproval threw for order ${approval.order_id}:`, err);
    }
  }

  return { ok: true };
}
