// DR 0034, DR 0035, DR 0036, DR 0037: Delivery lifecycle management.
// Creation gate (DR 0034): Order ACTIVE + ≥1 Approval + all APPROVED.
// Actor authority (DR 0035): OWNER/ADMIN_OPERATIONS only.
// Terminal transitions (DR 0036): SENDING→COMPLETED / SENDING→FAILED.
// Completion criteria (DR 0037): all delivery_assets present; all-or-nothing.
// organizationId always from server-side JWT.

import { db } from '@/db/index';
import { approvals, assets, deliveries, deliveryAssets } from '@/db/schema/production';
import { orders } from '@/db/schema/commercial';
import { organizations } from '@/db/schema/core';
import { orgMemberships, users } from '@/db/schema/identity';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, count, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { AdminRole } from './types';
import { generateSignedUrl } from '@/lib/infrastructure/object-storage';
import { sendDeliveryEmail } from '@/lib/email/delivery';

// DR 0099 §2.4: 7-day signed URL TTL for transactional delivery emails.
const DELIVERY_EMAIL_URL_EXPIRY_SECONDS = 604800;

const MANAGE_ROLES: AdminRole[] = ['OWNER', 'ADMIN_OPERATIONS'];

export type CreateDeliveryResult =
  | { ok: true; deliveryId: string }
  | { ok: false; reason: string };

export async function createDelivery(params: {
  orderId: string;
  organizationId: string;
  assetIds: string[];
  actorId: string;
  actorRole: AdminRole;
}): Promise<CreateDeliveryResult> {
  const { orderId, organizationId, assetIds, actorId, actorRole } = params;

  if (!MANAGE_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  if (assetIds.length === 0) {
    return { ok: false, reason: 'Delivery must reference at least one Asset' };
  }

  // DR 0034 §2.1 gate — atomic: fetch all gate data before inserting
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
  // DR 0034 §2.1 condition 1: Order must be ACTIVE
  if (orderRows[0].status !== 'ACTIVE') {
    return { ok: false, reason: `Order must be ACTIVE, currently ${orderRows[0].status}` };
  }

  // DR 0034 §2.1 condition 2: ≥1 Approval for the Order
  // DR 0034 §2.1 condition 3: All Approvals are APPROVED
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
    const blockedId = uuidv7();
    await db.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'delivery',
      entity_id: blockedId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'DELIVERY_CREATION_BLOCKED',
      payload: { order_id: orderId, reason: 'No Approvals exist for Order', organization_id: organizationId },
    });
    return { ok: false, reason: 'Delivery requires at least one Approval for the Order' };
  }

  const nonApproved = approvalRows.filter((a) => a.status !== 'APPROVED');
  if (nonApproved.length > 0) {
    const blockedId = uuidv7();
    await db.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'delivery',
      entity_id: blockedId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'DELIVERY_CREATION_BLOCKED',
      payload: {
        order_id: orderId,
        reason: 'Not all Approvals are APPROVED',
        non_approved_count: nonApproved.length,
        organization_id: organizationId,
      },
    });
    return { ok: false, reason: 'All Approvals for the Order must be APPROVED before creating a Delivery' };
  }

  // Verify all specified asset IDs belong to this org and order
  const assetRows = await db
    .select({ id: assets.id, order_id: assets.order_id })
    .from(assets)
    .where(
      and(
        eq(assets.organization_id, organizationId),
        isNull(assets.archived_at),
      ),
    );

  const assetMap = new Map(assetRows.map((a) => [a.id, a]));
  for (const assetId of assetIds) {
    const asset = assetMap.get(assetId);
    if (!asset) {
      return { ok: false, reason: `Asset ${assetId} not found` };
    }
    if (asset.order_id !== orderId) {
      return { ok: false, reason: `Asset ${assetId} does not belong to the specified Order` };
    }
  }

  const deliveryId = uuidv7();
  const idempKey = `DELIVERY_CREATED:${deliveryId}`;

  await db.transaction(async (tx) => {
    await tx
      .insert(idempotencyKeys)
      .values({
        id: uuidv7(),
        key: idempKey,
        organization_id: organizationId,
        operation_type: 'DELIVERY_CREATED',
        status: 'PROCESSING',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .onConflictDoNothing();

    await tx.insert(deliveries).values({
      id: deliveryId,
      order_id: orderId,
      organization_id: organizationId,
      status: 'PREPARING',
    });

    await tx.insert(deliveryAssets).values(
      assetIds.map((assetId) => ({
        delivery_id: deliveryId,
        asset_id: assetId,
        organization_id: organizationId,
      })),
    );

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'delivery',
      entity_id: deliveryId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'DELIVERY_CREATED',
      payload: {
        delivery_id: deliveryId,
        order_id: orderId,
        asset_count: assetIds.length,
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

  return { ok: true, deliveryId };
}

export type SendDeliveryResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function sendDelivery(params: {
  deliveryId: string;
  organizationId: string;
  actorId: string;
  actorRole: AdminRole;
}): Promise<SendDeliveryResult> {
  const { deliveryId, organizationId, actorId, actorRole } = params;

  if (!MANAGE_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  const deliveryRows = await db
    .select({ id: deliveries.id, status: deliveries.status })
    .from(deliveries)
    .where(
      and(
        eq(deliveries.id, deliveryId),
        eq(deliveries.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (deliveryRows.length === 0) {
    return { ok: false, reason: 'Delivery not found' };
  }

  const delivery = deliveryRows[0];

  if (delivery.status === 'SENDING') return { ok: true };
  if (delivery.status !== 'PREPARING') {
    return { ok: false, reason: `Delivery is not in PREPARING state (currently ${delivery.status})` };
  }

  const idempKey = `DELIVERY_SENDING:${deliveryId}`;

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'DELIVERY_SENDING',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      const updated = await tx
        .update(deliveries)
        .set({ status: 'SENDING', updated_at: new Date() })
        .where(
          and(
            eq(deliveries.id, deliveryId),
            eq(deliveries.organization_id, organizationId),
            eq(deliveries.status, 'PREPARING'),
          ),
        )
        .returning({ id: deliveries.id });

      if (updated.length === 0) throw new Error('CONCURRENT_MODIFICATION');

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'delivery',
        entity_id: deliveryId,
        actor_id: actorId,
        actor_role: actorRole,
        action: 'DELIVERY_SENDING',
        payload: { delivery_id: deliveryId, organization_id: organizationId },
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

  // DR 0099 §2.3: Post-transaction email dispatch at PREPARING→SENDING transition.
  // Email failure triggers compensating rollback of delivery status to PREPARING.
  try {
    const assetRows = await db
      .select({
        asset_id: deliveryAssets.asset_id,
        name: assets.name,
        file_key: assets.file_key,
      })
      .from(deliveryAssets)
      .innerJoin(assets, eq(assets.id, deliveryAssets.asset_id))
      .where(
        and(
          eq(deliveryAssets.delivery_id, deliveryId),
          eq(deliveryAssets.organization_id, organizationId),
        ),
      );

    const orgRows = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    const organizationName = orgRows[0]?.name ?? organizationId;

    // DR 0099 §2.6: Resolve recipients from identity.org_memberships JOIN identity.users.
    // Only active CLIENT-role members of the delivery's organization.
    const memberRows = await db
      .select({ email: users.email })
      .from(orgMemberships)
      .innerJoin(users, eq(users.id, orgMemberships.user_id))
      .where(
        and(
          eq(orgMemberships.organization_id, organizationId),
          eq(orgMemberships.role, 'CLIENT'),
          isNull(orgMemberships.archived_at),
          isNull(users.archived_at),
        ),
      );

    const toEmails = memberRows.map((r) => r.email);

    const assetLinks: Array<{ assetId: string; assetName: string; url: string; expiresAt: string }> = [];
    for (const row of assetRows) {
      if (row.file_key) {
        const url = await generateSignedUrl(row.file_key, DELIVERY_EMAIL_URL_EXPIRY_SECONDS);
        const expiresAt = new Date(Date.now() + DELIVERY_EMAIL_URL_EXPIRY_SECONDS * 1000).toISOString();
        assetLinks.push({
          assetId: row.asset_id,
          assetName: row.name ?? row.asset_id,
          url,
          expiresAt,
        });
      }
    }

    const emailDispatched = toEmails.length > 0 && assetLinks.length > 0;
    if (emailDispatched) {
      await sendDeliveryEmail({
        to: toEmails,
        deliveryId,
        organizationName,
        assetLinks,
      });
    }

    await db.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'delivery',
      entity_id: deliveryId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'DELIVERY_SENT',
      payload: {
        delivery_id: deliveryId,
        emailDispatched,
        recipientCount: toEmails.length,
        assetCount: assetLinks.length,
        organization_id: organizationId,
      },
    });
  } catch {
    await db
      .update(deliveries)
      .set({ status: 'PREPARING', updated_at: new Date() })
      .where(
        and(
          eq(deliveries.id, deliveryId),
          eq(deliveries.organization_id, organizationId),
        ),
      );
    return { ok: false, reason: 'email_dispatch_failed' };
  }

  return { ok: true };
}

export type CompleteDeliveryResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function completeDelivery(params: {
  deliveryId: string;
  organizationId: string;
  actorId: string;
  actorRole: AdminRole;
}): Promise<CompleteDeliveryResult> {
  const { deliveryId, organizationId, actorId, actorRole } = params;

  if (!MANAGE_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  const deliveryRows = await db
    .select({ id: deliveries.id, status: deliveries.status })
    .from(deliveries)
    .where(
      and(
        eq(deliveries.id, deliveryId),
        eq(deliveries.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (deliveryRows.length === 0) {
    return { ok: false, reason: 'Delivery not found' };
  }

  const delivery = deliveryRows[0];

  // DR 0036 §7: idempotent for already-COMPLETED
  if (delivery.status === 'COMPLETED') return { ok: true };
  if (delivery.status !== 'SENDING') {
    return { ok: false, reason: 'Delivery is not in SENDING state' };
  }

  // DR 0037 §2.4: zero-asset delivery may not be COMPLETED
  const assetCountRows = await db
    .select({ count: count() })
    .from(deliveryAssets)
    .where(
      and(
        eq(deliveryAssets.delivery_id, deliveryId),
        eq(deliveryAssets.organization_id, organizationId),
      ),
    );

  const assetCount = assetCountRows[0]?.count ?? 0;
  if (assetCount === 0) {
    return { ok: false, reason: 'Delivery has no associated assets' };
  }

  const idempKey = `DELIVERY_COMPLETED:${deliveryId}`;

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
          operation_type: 'DELIVERY_COMPLETED',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      const updated = await tx
        .update(deliveries)
        .set({ status: 'COMPLETED', updated_at: new Date() })
        .where(
          and(
            eq(deliveries.id, deliveryId),
            eq(deliveries.organization_id, organizationId),
            eq(deliveries.status, 'SENDING'),
          ),
        )
        .returning({ id: deliveries.id });

      if (updated.length === 0) throw new Error('CONCURRENT_MODIFICATION');

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'delivery',
        entity_id: deliveryId,
        actor_id: actorId,
        actor_role: actorRole,
        action: 'DELIVERY_COMPLETED',
        payload: {
          delivery_id: deliveryId,
          asset_count: assetCount,
          completed_at: new Date().toISOString(),
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

export type FailDeliveryResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function failDelivery(params: {
  deliveryId: string;
  organizationId: string;
  failureReason: string;
  actorId: string;
  actorRole: AdminRole;
}): Promise<FailDeliveryResult> {
  const { deliveryId, organizationId, failureReason, actorId, actorRole } = params;

  if (!MANAGE_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  if (!failureReason.trim()) {
    return { ok: false, reason: 'failure_reason is required' };
  }

  const deliveryRows = await db
    .select({ id: deliveries.id, status: deliveries.status })
    .from(deliveries)
    .where(
      and(
        eq(deliveries.id, deliveryId),
        eq(deliveries.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (deliveryRows.length === 0) {
    return { ok: false, reason: 'Delivery not found' };
  }

  const delivery = deliveryRows[0];

  if (delivery.status === 'FAILED') return { ok: true };
  if (delivery.status !== 'SENDING') {
    return { ok: false, reason: `Delivery is not in SENDING state (currently ${delivery.status})` };
  }

  const idempKey = `DELIVERY_FAILED:${deliveryId}`;

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'DELIVERY_FAILED',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      const updated = await tx
        .update(deliveries)
        .set({ status: 'FAILED', failure_reason: failureReason, updated_at: new Date() })
        .where(
          and(
            eq(deliveries.id, deliveryId),
            eq(deliveries.organization_id, organizationId),
            eq(deliveries.status, 'SENDING'),
          ),
        )
        .returning({ id: deliveries.id });

      if (updated.length === 0) throw new Error('CONCURRENT_MODIFICATION');

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'delivery',
        entity_id: deliveryId,
        actor_id: actorId,
        actor_role: actorRole,
        action: 'DELIVERY_FAILED',
        payload: {
          delivery_id: deliveryId,
          failure_reason: failureReason,
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

export type CancelDeliveryResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function cancelDelivery(params: {
  deliveryId: string;
  organizationId: string;
  actorId: string;
  actorRole: AdminRole;
}): Promise<CancelDeliveryResult> {
  const { deliveryId, organizationId, actorId, actorRole } = params;

  if (!MANAGE_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  const deliveryRows = await db
    .select({ id: deliveries.id, status: deliveries.status })
    .from(deliveries)
    .where(
      and(
        eq(deliveries.id, deliveryId),
        eq(deliveries.organization_id, organizationId),
      ),
    )
    .limit(1);

  if (deliveryRows.length === 0) {
    return { ok: false, reason: 'Delivery not found' };
  }

  const delivery = deliveryRows[0];

  if (delivery.status === 'CANCELLED') return { ok: true };
  if (
    delivery.status === 'COMPLETED' ||
    delivery.status === 'FAILED'
  ) {
    return { ok: false, reason: 'Delivery is already in terminal state' };
  }

  const idempKey = `DELIVERY_CANCELLED:${deliveryId}`;

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: organizationId,
          operation_type: 'DELIVERY_CANCELLED',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      const updated = await tx
        .update(deliveries)
        .set({ status: 'CANCELLED', updated_at: new Date() })
        .where(
          and(
            eq(deliveries.id, deliveryId),
            eq(deliveries.organization_id, organizationId),
            eq(deliveries.status, delivery.status),
          ),
        )
        .returning({ id: deliveries.id });

      if (updated.length === 0) throw new Error('CONCURRENT_MODIFICATION');

      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: organizationId,
        entity_type: 'delivery',
        entity_id: deliveryId,
        actor_id: actorId,
        actor_role: actorRole,
        action: 'DELIVERY_CANCELLED',
        payload: { delivery_id: deliveryId, organization_id: organizationId },
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
