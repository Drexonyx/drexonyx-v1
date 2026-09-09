// DR 0100: Portal revision request service.
// CLIENT signals revision intent via an audit event — does not transition Asset status
// or create a ProductionJob (both remain admin-only operations).
// organizationId always from server-side session, never from client input.

import { db } from '@/db/index';
import { assets } from '@/db/schema/production';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

export type RequestRevisionResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function requestRevision(params: {
  assetId: string;
  organizationId: string;
  actorId: string;
  actorRole: string;
  notes?: string;
}): Promise<RequestRevisionResult> {
  const { assetId, organizationId, actorId, actorRole, notes } = params;

  // 1. Tenant-isolated asset lookup (DR 0100 §2.4 step 1)
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

  if (assetRows.length === 0) return { ok: false, reason: 'not_found' };

  // 2. Status check (DR 0100 §2.4 step 2)
  if (assetRows[0].status !== 'REVISION_REQUIRED') {
    return { ok: false, reason: 'not_revision_required' };
  }

  // 3. Idempotency check (DR 0100 §2.4 step 3)
  const idempKey = `REVISION_REQUESTED:${assetId}:${actorId}`;
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

  // 4. Write REVISION_REQUESTED audit event (DR 0100 §2.2)
  await db.transaction(async (tx) => {
    await tx
      .insert(idempotencyKeys)
      .values({
        id: uuidv7(),
        key: idempKey,
        organization_id: organizationId,
        operation_type: 'REVISION_REQUESTED',
        status: 'PROCESSING',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .onConflictDoNothing();

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'asset',
      entity_id: assetId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'REVISION_REQUESTED',
      payload: {
        asset_id: assetId,
        organization_id: organizationId,
        ...(notes ? { notes } : {}),
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

  return { ok: true };
}
