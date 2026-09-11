// DR 0004, DR 0070: Admin brief creation — OWNER/ADMIN_OPERATIONS only.
// Brief content fields per DR 0070 §2.1 are nullable and may be populated at creation.
// organizationId always comes from the server-side JWT; never from client input.

import { db } from '@/db/index';
import { briefs } from '@/db/schema/commercial';
import { auditEvents } from '@/db/schema/system';
import { uuidv7 } from 'uuidv7';
import type { AdminRole } from './types';

const CREATE_ROLES: AdminRole[] = ['OWNER', 'ADMIN_OPERATIONS'];

export type CreateBriefResult =
  | { ok: true; briefId: string }
  | { ok: false; reason: string };

export async function createBrief(params: {
  campaignId: string;
  organizationId: string;
  actorId: string;
  actorRole: AdminRole;
  briefText?: string | null;
  deliverables?: string | null;
  targetAudience?: string | null;
  timelineNotes?: string | null;
  additionalNotes?: string | null;
}): Promise<CreateBriefResult> {
  const {
    campaignId,
    organizationId,
    actorId,
    actorRole,
    briefText,
    deliverables,
    targetAudience,
    timelineNotes,
    additionalNotes,
  } = params;

  if (!CREATE_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  if (!campaignId) {
    return { ok: false, reason: 'Campaign ID is required' };
  }

  const briefId = uuidv7();

  await db.transaction(async (tx) => {
    await tx.insert(briefs).values({
      id: briefId,
      campaign_id: campaignId,
      organization_id: organizationId,
      status: 'DRAFT',
      brief_text: briefText ?? null,
      deliverables: deliverables ?? null,
      target_audience: targetAudience ?? null,
      timeline_notes: timelineNotes ?? null,
      additional_notes: additionalNotes ?? null,
    });

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'brief',
      entity_id: briefId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'BRIEF_CREATED',
      payload: {
        brief_id: briefId,
        campaign_id: campaignId,
        status: 'DRAFT',
      },
    });
  });

  return { ok: true, briefId };
}
