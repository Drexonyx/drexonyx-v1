// DR 0104: Order lifecycle close-out — ACTIVE→COMPLETED / ACTIVE→CANCELLED.
// completeOrder: OWNER/ADMIN_OPERATIONS. Conjunction guard: ≥1 Delivery (all COMPLETED)
//   AND ≥1 Approval (all APPROVED). CAS on status='ACTIVE'. Idempotency key + audit in transaction.
// cancelOrder: OWNER/ADMIN_OPERATIONS. No cascade to related records. PAID payments: LOG-ONLY.
// organizationId always from server-side JWT. Financial tables not mutated.

import { db } from '@/db/index';
import { orders } from '@/db/schema/commercial';
import { approvals, deliveries } from '@/db/schema/production';
import { payments } from '@/db/schema/financial';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { AdminRole } from './types';

const MANAGE_ROLES: AdminRole[] = ['OWNER', 'ADMIN_OPERATIONS'];

export type CompleteOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: string };

export type CancelOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: string };

export async function completeOrder(params: {
  orderId: string;
  organizationId: string;
  actorId: string;
  actorRole: AdminRole;
}): Promise<CompleteOrderResult> {
  const { orderId, organizationId, actorId, actorRole } = params;

  if (!MANAGE_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

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

  if (orderRows[0].status === 'COMPLETED') {
    return { ok: true, orderId };
  }

  if (orderRows[0].status !== 'ACTIVE') {
    return { ok: false, reason: `Order cannot be completed: status is ${orderRows[0].status}` };
  }

  // DR 0104 Owner Decision 1: conjunction guard
  const deliveryRows = await db
    .select({ id: deliveries.id, status: deliveries.status })
    .from(deliveries)
    .where(
      and(
        eq(deliveries.order_id, orderId),
        eq(deliveries.organization_id, organizationId),
        isNull(deliveries.archived_at),
      ),
    );

  if (deliveryRows.length === 0) {
    return { ok: false, reason: 'Order cannot be completed: no Deliveries exist' };
  }

  const nonCompletedDeliveries = deliveryRows.filter((d) => d.status !== 'COMPLETED');
  if (nonCompletedDeliveries.length > 0) {
    return { ok: false, reason: 'Order cannot be completed: all Deliveries must be COMPLETED' };
  }

  const approvalRows = await db
    .select({ id: approvals.id, status: approvals.status })
    .from(approvals)
    .where(
      and(
        eq(approvals.order_id, orderId),
        eq(approvals.organization_id, organizationId),
        isNull(approvals.archived_at),
      ),
    );

  if (approvalRows.length === 0) {
    return { ok: false, reason: 'Order cannot be completed: no Approvals exist' };
  }

  const nonApprovedApprovals = approvalRows.filter((a) => a.status !== 'APPROVED');
  if (nonApprovedApprovals.length > 0) {
    return { ok: false, reason: 'Order cannot be completed: all Approvals must be APPROVED' };
  }

  const idempKey = `ORDER_COMPLETED:${orderId}`;

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'ORDER_COMPLETED',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      const updated = await tx
        .update(orders)
        .set({ status: 'COMPLETED', updated_at: new Date() })
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.organization_id, organizationId),
            eq(orders.status, 'ACTIVE'),
          ),
        )
        .returning({ id: orders.id });

      if (updated.length === 0) {
        throw new Error('CONCURRENT_MODIFICATION');
      }

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'order',
        entity_id: orderId,
        actor_id: actorId,
        actor_role: actorRole,
        action: 'ORDER_COMPLETED',
        payload: {
          order_id: orderId,
          delivery_count: deliveryRows.length,
          approval_count: approvalRows.length,
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
      return { ok: true, orderId };
    }
    throw e;
  }

  return { ok: true, orderId };
}

export async function cancelOrder(params: {
  orderId: string;
  organizationId: string;
  actorId: string;
  actorRole: AdminRole;
}): Promise<CancelOrderResult> {
  const { orderId, organizationId, actorId, actorRole } = params;

  if (!MANAGE_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

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

  if (orderRows[0].status === 'CANCELLED') {
    return { ok: true, orderId };
  }

  if (orderRows[0].status !== 'ACTIVE') {
    return { ok: false, reason: `Order cannot be cancelled: status is ${orderRows[0].status}` };
  }

  // DR 0104 Owner Decision 4: log PAID payments — no financial mutation
  const paidPayments = await db
    .select({ id: payments.id, amount: payments.amount, currency: payments.currency })
    .from(payments)
    .where(
      and(
        eq(payments.order_id, orderId),
        eq(payments.organization_id, organizationId),
        eq(payments.status, 'PAID'),
      ),
    );

  const idempKey = `ORDER_CANCELLED:${orderId}`;

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'ORDER_CANCELLED',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      const updated = await tx
        .update(orders)
        .set({ status: 'CANCELLED', updated_at: new Date() })
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.organization_id, organizationId),
            eq(orders.status, 'ACTIVE'),
          ),
        )
        .returning({ id: orders.id });

      if (updated.length === 0) {
        throw new Error('CONCURRENT_MODIFICATION');
      }

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'order',
        entity_id: orderId,
        actor_id: actorId,
        actor_role: actorRole,
        action: 'ORDER_CANCELLED',
        payload: {
          order_id: orderId,
          paid_payment_count: paidPayments.length,
          paid_payment_ids: paidPayments.map((p) => p.id),
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
      return { ok: true, orderId };
    }
    throw e;
  }

  return { ok: true, orderId };
}
