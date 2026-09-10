// DR 0106: Admin quote creation — OWNER/ADMIN_OPERATIONS only.
// Quote is created as DRAFT in DREXONYX's production organization (caller's organizationId).
// organizationId always comes from the server-side JWT; never from client input.
// Campaign must exist in the same organization and must not be archived.

import { db } from '@/db/index';
import { campaigns, quotes } from '@/db/schema/commercial';
import { auditEvents } from '@/db/schema/system';
import { and, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { AdminRole } from './types';

const CREATE_ROLES: AdminRole[] = ['OWNER', 'ADMIN_OPERATIONS'];

export type CreateQuoteResult =
  | { ok: true; quoteId: string }
  | { ok: false; reason: string };

export async function createQuote(params: {
  campaignId: string;
  totalAmount: string;
  estimatedCost?: string;
  organizationId: string;
  actorId: string;
  actorRole: AdminRole;
}): Promise<CreateQuoteResult> {
  const { campaignId, totalAmount, estimatedCost, organizationId, actorId, actorRole } = params;

  if (!CREATE_ROLES.includes(actorRole)) {
    return { ok: false, reason: 'Insufficient authority' };
  }

  const totalNum = parseFloat(totalAmount);
  if (!isFinite(totalNum) || totalNum <= 0) {
    return { ok: false, reason: 'Total amount must be a positive number' };
  }

  const costValue = estimatedCost && estimatedCost.trim() !== '' ? estimatedCost.trim() : null;
  if (costValue !== null) {
    const costNum = parseFloat(costValue);
    if (!isFinite(costNum) || costNum <= 0) {
      return { ok: false, reason: 'Estimated cost must be a positive number' };
    }
  }

  const campaignRows = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(
      and(
        eq(campaigns.id, campaignId),
        eq(campaigns.organization_id, organizationId),
        isNull(campaigns.archived_at),
      ),
    )
    .limit(1);

  if (campaignRows.length === 0) {
    return { ok: false, reason: 'Campaign not found' };
  }

  const quoteId = uuidv7();

  await db.transaction(async (tx) => {
    await tx.insert(quotes).values({
      id: quoteId,
      campaign_id: campaignId,
      organization_id: organizationId,
      status: 'DRAFT',
      total_amount: totalAmount,
      estimated_cost: costValue,
      currency: 'USD',
    });

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'quote',
      entity_id: quoteId,
      actor_id: actorId,
      actor_role: actorRole,
      action: 'QUOTE_CREATED',
      payload: {
        quote_id: quoteId,
        campaign_id: campaignId,
        total_amount: totalAmount,
        estimated_cost: costValue,
        status: 'DRAFT',
      },
    });
  });

  return { ok: true, quoteId };
}
