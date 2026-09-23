// Self-service order creation — public checkout flow.
// Creates Campaign + Quote (AED, ACCEPTED) + Order (ACTIVE) + OrderBudget atomically.
// organizationId is always DREXONYX_ORG_ID from server env — never from client input.
// Amount is canonical from lib/pricing.ts — never from the client request body.

import { db } from '@/db/index';
import { campaigns, quotes, orders, orderBudgets } from '@/db/schema/commercial';
import { auditEvents } from '@/db/schema/system';
import { uuidv7 } from 'uuidv7';
import { PRODUCTION_PACKAGES } from '@/lib/pricing';

export type CreateSelfServiceOrderResult =
  | { ok: true; orderId: string; quoteId: string; campaignId: string; amount: string }
  | { ok: false; reason: string };

export async function createSelfServiceOrder(params: {
  pkgId: string;
  contactEmail: string;
  organizationId: string;
}): Promise<CreateSelfServiceOrderResult> {
  const { pkgId, contactEmail, organizationId } = params;

  // Validate package — amount comes from server-side canonical source only
  const pkg = PRODUCTION_PACKAGES.find((p) => p.id === pkgId);
  if (!pkg) return { ok: false, reason: `Unknown package: ${pkgId}` };

  const totalAmount = pkg.price.toFixed(4); // e.g. "3500.0000" — numeric(19,4) compatible
  const currency = 'AED';

  const campaignId = uuidv7();
  const quoteId = uuidv7();
  const orderId = uuidv7();
  const orderBudgetId = uuidv7();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(campaigns).values({
      id: campaignId,
      organization_id: organizationId,
      name: `Self-Service — ${pkg.name} — ${contactEmail}`,
      status: 'ORDERED',
      created_at: now,
      updated_at: now,
    });

    // Quote is created directly as ACCEPTED (no admin review step in self-service)
    await tx.insert(quotes).values({
      id: quoteId,
      campaign_id: campaignId,
      organization_id: organizationId,
      status: 'ACCEPTED',
      total_amount: totalAmount,
      currency,
      accepted_at: now,
      created_at: now,
      updated_at: now,
    });

    await tx.insert(orders).values({
      id: orderId,
      campaign_id: campaignId,
      quote_id: quoteId,
      organization_id: organizationId,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    });

    await tx.insert(orderBudgets).values({
      id: orderBudgetId,
      order_id: orderId,
      organization_id: organizationId,
      planned_amount: totalAmount,
      created_at: now,
      updated_at: now,
    });

    await tx.insert(auditEvents).values({
      id: uuidv7(),
      organization_id: organizationId,
      entity_type: 'order',
      entity_id: orderId,
      actor_id: null,
      actor_role: 'SYSTEM',
      action: 'SELF_SERVICE_ORDER_CREATED',
      payload: {
        campaign_id: campaignId,
        quote_id: quoteId,
        order_id: orderId,
        pkg_id: pkgId,
        pkg_name: pkg.name,
        contact_email: contactEmail,
        total_amount: totalAmount,
        currency,
      },
    });
  });

  return { ok: true, orderId, quoteId, campaignId, amount: totalAmount };
}
