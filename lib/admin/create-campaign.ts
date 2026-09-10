// DR 0106: Admin campaign creation — OWNER/ADMIN_OPERATIONS only.
// Campaign is created in DREXONYX's production organization (caller's organizationId).
// organizationId always comes from the server-side JWT; never from client input.

import { db } from '@/db/index';
import { campaigns } from '@/db/schema/commercial';
import { auditEvents } from '@/db/schema/system';
import { uuidv7 } from 'uuidv7';
import type { AdminRole } from './types';

const CREATE_ROLES: AdminRole[] = ['OWNER', 'ADMIN_OPERATIONS'];

export type CreateCampaignResult =
  | { ok: true; campaignId: string }
  | { ok: false; reason: string };

export async function createCampaign(params: {
  name: string;
  organizationId: string;
  actorId: string;
  actorRole: AdminRole;
}): Promise<CreateCampaignResult> {
  const { name, organizationId, actorId, actorRole } = params;

  if (!CREATE_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  const nameT = name.trim();
  if (nameT.length < 1 || nameT.length > 255) {
    return { ok: false, reason: 'Campaign name must be 1–255 characters' };
  }

  const campaignId = uuidv7();

  await db.transaction(async (tx) => {
    await tx.insert(campaigns).values({
      id: campaignId,
      organization_id: organizationId,
      name: nameT,
      status: 'DRAFT',
    });

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'campaign',
      entity_id: campaignId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'CAMPAIGN_CREATED',
      payload: {
        campaign_id: campaignId,
        name: nameT,
        status: 'DRAFT',
      },
    });
  });

  return { ok: true, campaignId };
}
