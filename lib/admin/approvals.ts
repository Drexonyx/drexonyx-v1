// DR 0028, DR 0029: Approval creation and cancellation (admin side).
// OWNER/ADMIN_OPERATIONS create and cancel Approvals.
// CLIENT decides (accept/reject) via portal — see lib/portal/approvals.ts.
// organizationId always from server-side JWT.

import { db } from '@/db/index';
import { approvals, assets } from '@/db/schema/production';
import { orders } from '@/db/schema/commercial';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { AdminRole } from './types';

const MANAGE_ROLES: AdminRole[] = ['OWNER', 'ADMIN_OPERATIONS'];

export type CreateApprovalResult =
  | { ok: true; approvalId: string }
  | { ok: false; reason: string };

export async function createApproval(params: {
  orderId: string;
  organizationId: string;
  targetType: 'ASSET' | 'QUOTE';
  targetId: string;
  expiresAt?: Date;
  actorId: string;
  actorRole: AdminRole;
}): Promise<CreateApprovalResult> {
  const { orderId, organizationId, targetType, targetId, expiresAt, actorId, actorRole } = params;

  if (!MANAGE_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  // Verify Order exists and is ACTIVE
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
    return { ok: false, reason: `Cannot create Approval for Order in ${orderRows[0].status} status` };
  }

  // DR 0028 §2: For ASSET target, verify Asset is in CLIENT_PREVIEW state (QC cleared)
  if (targetType === 'ASSET') {
    const assetRows = await db
      .select({ id: assets.id, status: assets.status, order_id: assets.order_id })
      .from(assets)
      .where(
        and(
          eq(assets.id, targetId),
          eq(assets.organization_id, organizationId),
        ),
      )
      .limit(1);

    if (assetRows.length === 0) {
      return { ok: false, reason: 'Asset not found' };
    }
    if (assetRows[0].order_id !== orderId) {
      return { ok: false, reason: 'Asset does not belong to the specified Order' };
    }
    if (assetRows[0].status !== 'CLIENT_PREVIEW') {
      return { ok: false, reason: `Asset must be in CLIENT_PREVIEW status to create an Approval, currently ${assetRows[0].status}` };
    }
  }

  const approvalId = uuidv7();
  const idempKey = `APPROVAL_CREATED:${approvalId}`;

  await db.transaction(async (tx) => {
    await tx
      .insert(idempotencyKeys)
      .values({
        id: uuidv7(),
        key: idempKey,
        organization_id: organizationId,
        operation_type: 'APPROVAL_CREATED',
        status: 'PROCESSING',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .onConflictDoNothing();

    await tx.insert(approvals).values({
      id: approvalId,
      order_id: orderId,
      organization_id: organizationId,
      target_type: targetType,
      target_id: targetId,
      status: 'PENDING',
      created_by_user_id: actorId,
      expires_at: expiresAt ?? null,
    });

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'approval',
      entity_id: approvalId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'APPROVAL_CREATED',
      payload: {
        approval_id: approvalId,
        order_id: orderId,
        target_type: targetType,
        target_id: targetId,
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

  return { ok: true, approvalId };
}

export type CancelApprovalResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function cancelApproval(params: {
  approvalId: string;
  organizationId: string;
  actorId: string;
  actorRole: AdminRole;
}): Promise<CancelApprovalResult> {
  const { approvalId, organizationId, actorId, actorRole } = params;

  if (!MANAGE_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  const approvalRows = await db
    .select({ id: approvals.id, status: approvals.status })
    .from(approvals)
    .where(
      and(
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

  if (approval.status === 'CANCELLED') return { ok: true };
  if (approval.status !== 'PENDING') {
    return { ok: false, reason: `Cannot cancel Approval in ${approval.status} status` };
  }

  const idempKey = `APPROVAL_CANCELLED:${approvalId}`;

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'APPROVAL_CANCELLED',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      const updated = await tx
        .update(approvals)
        .set({ status: 'CANCELLED', updated_at: new Date() })
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
        action: 'APPROVAL_CANCELLED',
        payload: { approval_id: approvalId, organization_id: organizationId },
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
