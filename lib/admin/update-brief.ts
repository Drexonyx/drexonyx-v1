// DR 0004, DR 0070: Admin brief content updates and state transitions.
// Transitions follow the DR 0004 state machine. Actor/role permissions use the
// established system pattern (OWNER/ADMIN_OPERATIONS) since DR 0004 deferred
// exact permissions at state-machine approval time.

import { eq } from 'drizzle-orm';
import { db } from '@/db/index';
import { briefs } from '@/db/schema/commercial';
import { auditEvents } from '@/db/schema/system';
import { uuidv7 } from 'uuidv7';
import type { AdminRole } from './types';

const ALLOWED_ROLES: AdminRole[] = ['OWNER', 'ADMIN_OPERATIONS'];

export type UpdateBriefResult =
  | { ok: true }
  | { ok: false; reason: string };

function isAllowed(role: AdminRole): boolean {
  return ALLOWED_ROLES.includes(role);
}

export async function updateBriefContent(params: {
  briefId: string;
  organizationId: string;
  actorId: string;
  actorRole: AdminRole;
  briefText?: string | null;
  deliverables?: string | null;
  targetAudience?: string | null;
  timelineNotes?: string | null;
  additionalNotes?: string | null;
}): Promise<UpdateBriefResult> {
  const {
    briefId,
    organizationId,
    actorId,
    actorRole,
    briefText,
    deliverables,
    targetAudience,
    timelineNotes,
    additionalNotes,
  } = params;

  if (!isAllowed(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(briefs)
      .set({
        brief_text: briefText ?? null,
        deliverables: deliverables ?? null,
        target_audience: targetAudience ?? null,
        timeline_notes: timelineNotes ?? null,
        additional_notes: additionalNotes ?? null,
        updated_at: new Date(),
      })
      .where(eq(briefs.id, briefId));

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'brief',
      entity_id: briefId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'BRIEF_CONTENT_UPDATED',
      payload: { brief_id: briefId },
    });
  });

  return { ok: true };
}

// DR 0004: DRAFT → SUBMITTED
export async function submitBrief(params: {
  briefId: string;
  organizationId: string;
  actorId: string;
  actorRole: AdminRole;
}): Promise<UpdateBriefResult> {
  const { briefId, organizationId, actorId, actorRole } = params;

  if (!isAllowed(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(briefs)
      .set({ status: 'SUBMITTED', updated_at: new Date() })
      .where(eq(briefs.id, briefId));

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'brief',
      entity_id: briefId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'BRIEF_SUBMITTED',
      payload: { brief_id: briefId },
    });
  });

  return { ok: true };
}

// DR 0004: SUBMITTED → APPROVED
export async function approveBrief(params: {
  briefId: string;
  organizationId: string;
  actorId: string;
  actorRole: AdminRole;
}): Promise<UpdateBriefResult> {
  const { briefId, organizationId, actorId, actorRole } = params;

  if (!isAllowed(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(briefs)
      .set({ status: 'APPROVED', updated_at: new Date() })
      .where(eq(briefs.id, briefId));

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'brief',
      entity_id: briefId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'BRIEF_APPROVED',
      payload: { brief_id: briefId },
    });
  });

  return { ok: true };
}

// DR 0004: SUBMITTED → REVISION_REQUIRED or APPROVED → REVISION_REQUIRED
export async function requestBriefRevision(params: {
  briefId: string;
  organizationId: string;
  actorId: string;
  actorRole: AdminRole;
}): Promise<UpdateBriefResult> {
  const { briefId, organizationId, actorId, actorRole } = params;

  if (!isAllowed(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(briefs)
      .set({ status: 'REVISION_REQUIRED', updated_at: new Date() })
      .where(eq(briefs.id, briefId));

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'brief',
      entity_id: briefId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'BRIEF_REVISION_REQUESTED',
      payload: { brief_id: briefId },
    });
  });

  return { ok: true };
}

// DR 0004: REVISION_REQUIRED → DRAFT
export async function returnBriefToDraft(params: {
  briefId: string;
  organizationId: string;
  actorId: string;
  actorRole: AdminRole;
}): Promise<UpdateBriefResult> {
  const { briefId, organizationId, actorId, actorRole } = params;

  if (!isAllowed(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(briefs)
      .set({ status: 'DRAFT', updated_at: new Date() })
      .where(eq(briefs.id, briefId));

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'brief',
      entity_id: briefId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'BRIEF_RETURNED_TO_DRAFT',
      payload: { brief_id: briefId },
    });
  });

  return { ok: true };
}
