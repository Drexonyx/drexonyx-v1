// DR 0104: Order lifecycle close-out — ACTIVE→COMPLETED / ACTIVE→CANCELLED.
// completeOrder: OWNER/ADMIN_OPERATIONS. Conjunction guard: ≥1 Delivery (all COMPLETED)
//   AND ≥1 Approval (all APPROVED). Idempotency fast-path + CAS. Audit ORDER_COMPLETED.
// cancelOrder: OWNER/ADMIN_OPERATIONS. No cascade. PAID payments: LOG-ONLY (no reversal).
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

  const idempKey = `ORDER_COMPLETED:${orderId}`;

  // DR 0104 §3.4: Fast-path idempotency check — skip guard and UPDATE if already done
  const existingKey = await db
    .select({ status: idempotencyKeys.status })
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.key, idempKey),
        eq(idempotencyKeys.organization_id, organizationId),
        eq(idempotencyKeys.operation_type, 'ORDER_COMPLETED'),
      ),
    )
    .limit(1);

  if (existingKey.length > 0) {
    if (existingKey[0].status === 'COMPLETED') return { ok: true, orderId };
    if (existingKey[0].status === 'PROCESSING') return { ok: false, reason: 'IN_PROGRESS' };
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

  // DR 0104 §3.2: Conjunction guard — ≥1 Delivery all COMPLETED AND ≥1 Approval all APPROVED
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

      // DR 0104 §3.5: Audit event with delivery_ids and approval_ids arrays
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
          previous_status: 'ACTIVE',
          new_status: 'COMPLETED',
          delivery_ids: deliveryRows.map((d) => d.id),
          approval_ids: approvalRows.map((a) => a.id),
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
  reason?: string;
}): Promise<CancelOrderResult> {
  const { orderId, organizationId, actorId, actorRole, reason } = params;

  if (!MANAGE_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  const idempKey = `ORDER_CANCELLED:${orderId}`;

  // DR 0104 §3.9: Fast-path idempotency check
  const existingKey = await db
    .select({ status: idempotencyKeys.status })
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.key, idempKey),
        eq(idempotencyKeys.organization_id, organizationId),
        eq(idempotencyKeys.operation_type, 'ORDER_CANCELLED'),
      ),
    )
    .limit(1);

  if (existingKey.length > 0) {
    if (existingKey[0].status === 'COMPLETED') return { ok: true, orderId };
    if (existingKey[0].status === 'PROCESSING') return { ok: false, reason: 'IN_PROGRESS' };
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

  // DR 0104 §3.7: Check for PAID payments — log only, no financial mutation
  const paidPayments = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.order_id, orderId),
        eq(payments.organization_id, organizationId),
        eq(payments.status, 'PAID'),
      ),
    )
    .limit(1);

  const hadPaidPayment = paidPayments.length > 0;
  const paymentId = paidPayments[0]?.id ?? null;

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

      // DR 0104 §3.10: Audit event with had_paid_payment, payment_id, and optional reason
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
          previous_status: 'ACTIVE',
          new_status: 'CANCELLED',
          reason: reason ?? null,
          had_paid_payment: hadPaidPayment,
          payment_id: paymentId,
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
