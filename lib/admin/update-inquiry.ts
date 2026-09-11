// Inquiry status transitions — OWNER/ADMIN_OPERATIONS only.
// Inquiries are pre-org records; audit events are scoped to the actor's organization.

import { eq } from 'drizzle-orm';
import { db } from '@/db/index';
import { inquiries } from '@/db/schema/commercial';
import { auditEvents } from '@/db/schema/system';
import { uuidv7 } from 'uuidv7';
import type { AdminRole } from './types';

const ALLOWED_ROLES: AdminRole[] = ['OWNER', 'ADMIN_OPERATIONS'];

export type UpdateInquiryResult =
  | { ok: true }
  | { ok: false; reason: string };

function isAllowed(role: AdminRole): boolean {
  return ALLOWED_ROLES.includes(role);
}

export async function markInquiryReviewed(params: {
  inquiryId: string;
  actorId: string;
  actorRole: AdminRole;
  actorOrganizationId: string;
}): Promise<UpdateInquiryResult> {
  const { inquiryId, actorId, actorRole, actorOrganizationId } = params;

  if (!isAllowed(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(inquiries)
      .set({ status: 'REVIEWED', updated_at: new Date() })
      .where(eq(inquiries.id, inquiryId));

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: actorOrganizationId,
      entity_type: 'inquiry',
      entity_id: inquiryId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'INQUIRY_REVIEWED',
      payload: { inquiry_id: inquiryId },
    });
  });

  return { ok: true };
}

export async function markInquiryDismissed(params: {
  inquiryId: string;
  actorId: string;
  actorRole: AdminRole;
  actorOrganizationId: string;
}): Promise<UpdateInquiryResult> {
  const { inquiryId, actorId, actorRole, actorOrganizationId } = params;

  if (!isAllowed(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(inquiries)
      .set({ status: 'DISMISSED', updated_at: new Date() })
      .where(eq(inquiries.id, inquiryId));

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: actorOrganizationId,
      entity_type: 'inquiry',
      entity_id: inquiryId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'INQUIRY_DISMISSED',
      payload: { inquiry_id: inquiryId },
    });
  });

  return { ok: true };
}
