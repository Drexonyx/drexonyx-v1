import { and, desc, eq, isNull, inArray } from 'drizzle-orm';
import { db } from '@/db/index';
import { organizations, brandDna } from '@/db/schema/core';
import { campaigns, quotes, orders } from '@/db/schema/commercial';
import { payments } from '@/db/schema/financial';
import { assets, approvals, deliveries } from '@/db/schema/production';
import { auditEvents } from '@/db/schema/system';
import { isClientQuoteStatus } from './types';

// All queries are scoped to the authenticated user's organizationId from the
// server-side session. organizationId must never come from client-controlled input.
// password_hash is excluded from all returned data — it is never queried here.

export async function getOrganization(organizationId: string) {
  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getBrandDna(organizationId: string) {
  const rows = await db
    .select({
      brand_name: brandDna.brand_name,
      brand_voice: brandDna.brand_voice,
      visual_guidelines_summary: brandDna.visual_guidelines_summary,
      target_audience: brandDna.target_audience,
      updated_at: brandDna.updated_at,
    })
    .from(brandDna)
    .where(
      and(
        eq(brandDna.organization_id, organizationId),
        isNull(brandDna.archived_at),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getCampaigns(organizationId: string) {
  return db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      created_at: campaigns.created_at,
      updated_at: campaigns.updated_at,
    })
    .from(campaigns)
    .where(
      and(
        eq(campaigns.organization_id, organizationId),
        isNull(campaigns.archived_at),
      ),
    )
    .orderBy(desc(campaigns.created_at));
}

export async function getCampaign(organizationId: string, campaignId: string) {
  const rows = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      created_at: campaigns.created_at,
      updated_at: campaigns.updated_at,
    })
    .from(campaigns)
    .where(
      and(
        eq(campaigns.id, campaignId),
        eq(campaigns.organization_id, organizationId),
        isNull(campaigns.archived_at),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

// Returns only CLIENT-safe quote statuses (excludes DRAFT).
export async function getQuotes(organizationId: string) {
  const rows = await db
    .select({
      id: quotes.id,
      campaign_id: quotes.campaign_id,
      status: quotes.status,
      total_amount: quotes.total_amount,
      accepted_at: quotes.accepted_at,
      created_at: quotes.created_at,
      updated_at: quotes.updated_at,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.organization_id, organizationId),
        isNull(quotes.archived_at),
      ),
    )
    .orderBy(desc(quotes.created_at));

  // Filter to CLIENT-safe statuses server-side
  return rows.filter((r) => isClientQuoteStatus(r.status));
}

export async function getOrders(organizationId: string) {
  return db
    .select({
      id: orders.id,
      campaign_id: orders.campaign_id,
      quote_id: orders.quote_id,
      status: orders.status,
      created_at: orders.created_at,
      updated_at: orders.updated_at,
    })
    .from(orders)
    .where(
      and(
        eq(orders.organization_id, organizationId),
        isNull(orders.archived_at),
      ),
    )
    .orderBy(desc(orders.created_at));
}

// Returns orders with their most recent payment status for the Pay Now button.
// Only ACTIVE orders with no PAID/PROCESSING payment show Pay Now.
export async function getOrdersWithPaymentStatus(organizationId: string) {
  const orderRows = await db
    .select({
      id: orders.id,
      campaign_id: orders.campaign_id,
      quote_id: orders.quote_id,
      status: orders.status,
      created_at: orders.created_at,
      updated_at: orders.updated_at,
    })
    .from(orders)
    .where(
      and(
        eq(orders.organization_id, organizationId),
        isNull(orders.archived_at),
      ),
    )
    .orderBy(desc(orders.created_at));

  if (orderRows.length === 0) return [];

  const orderIds = orderRows.map((o) => o.id);

  const paymentRows = await db
    .select({
      order_id: payments.order_id,
      status: payments.status,
      amount: payments.amount,
      currency: payments.currency,
      created_at: payments.created_at,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organization_id, organizationId),
        inArray(payments.order_id, orderIds),
      ),
    )
    .orderBy(desc(payments.created_at));

  // Index payments by order_id — most recent first (already ordered)
  const paymentByOrder = new Map<string, typeof paymentRows[0]>();
  for (const p of paymentRows) {
    if (!paymentByOrder.has(p.order_id)) {
      paymentByOrder.set(p.order_id, p);
    }
  }

  return orderRows.map((o) => ({
    ...o,
    latestPayment: paymentByOrder.get(o.id) ?? null,
  }));
}

// Returns only CLIENT-safe asset statuses (CLIENT_PREVIEW, REVISION_REQUIRED).
export async function getClientAssets(organizationId: string) {
  const rows = await db
    .select({
      id: assets.id,
      order_id: assets.order_id,
      name: assets.name,
      content_url: assets.content_url,
      status: assets.status,
      created_at: assets.created_at,
      updated_at: assets.updated_at,
    })
    .from(assets)
    .where(
      and(
        eq(assets.organization_id, organizationId),
        isNull(assets.archived_at),
      ),
    )
    .orderBy(desc(assets.updated_at));

  // Filter to CLIENT-safe statuses only (DR 0040)
  return rows.filter(
    (r) => r.status === 'CLIENT_PREVIEW' || r.status === 'REVISION_REQUIRED',
  );
}

// Payments — CLIENT may see their payment status and amount.
// Internal financial tables (ledger, expenses, reserves, etc.) are not queried.
export async function getPayments(organizationId: string) {
  return db
    .select({
      id: payments.id,
      order_id: payments.order_id,
      amount: payments.amount,
      currency: payments.currency,
      status: payments.status,
      created_at: payments.created_at,
    })
    .from(payments)
    .where(eq(payments.organization_id, organizationId))
    .orderBy(desc(payments.created_at));
}

// Approvals — CLIENT may see approval status and target info for decide action.
// qc_reviews.notes and other internal QC data are not returned.
// DR 0029 §2.6: CLIENT may only decide ASSET-type Approvals; target_type exposed for filtering.
export async function getApprovals(organizationId: string) {
  return db
    .select({
      id: approvals.id,
      order_id: approvals.order_id,
      target_type: approvals.target_type,
      target_id: approvals.target_id,
      status: approvals.status,
      expires_at: approvals.expires_at,
      created_at: approvals.created_at,
      updated_at: approvals.updated_at,
    })
    .from(approvals)
    .where(
      and(
        eq(approvals.organization_id, organizationId),
        isNull(approvals.archived_at),
      ),
    )
    .orderBy(desc(approvals.created_at));
}

// Deliveries — CLIENT may see delivery status.
export async function getDeliveries(organizationId: string) {
  return db
    .select({
      id: deliveries.id,
      order_id: deliveries.order_id,
      status: deliveries.status,
      created_at: deliveries.created_at,
      updated_at: deliveries.updated_at,
    })
    .from(deliveries)
    .where(
      and(
        eq(deliveries.organization_id, organizationId),
        isNull(deliveries.archived_at),
      ),
    )
    .orderBy(desc(deliveries.created_at));
}

// DR 0088 §2.6: Returns the set of asset IDs for which a REVISION_INITIATED audit event exists.
// Used by the portal revisions page to distinguish "Revision in Progress" from "Revision Pending".
export async function getRevisionInitiatedAssetIds(organizationId: string): Promise<Set<string>> {
  const rows = await db
    .select({ payload: auditEvents.payload })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.organization_id, organizationId),
        eq(auditEvents.action, 'REVISION_INITIATED'),
      ),
    );

  const ids = new Set<string>();
  for (const row of rows) {
    const payload = row.payload as Record<string, unknown> | null;
    if (payload && typeof payload.original_asset_id === 'string') {
      ids.add(payload.original_asset_id);
    }
  }
  return ids;
}

// Dashboard summary counts — derived from CLIENT-safe data only.
export async function getDashboardCounts(organizationId: string) {
  const [allCampaigns, allAssets, allQuotes, allApprovals, allDeliveries] =
    await Promise.all([
      getCampaigns(organizationId),
      getClientAssets(organizationId),
      getQuotes(organizationId),
      getApprovals(organizationId),
      getDeliveries(organizationId),
    ]);

  return {
    campaigns: allCampaigns.length,
    assetsReadyForReview: allAssets.filter((a) => a.status === 'CLIENT_PREVIEW')
      .length,
    assetsInRevision: allAssets.filter((a) => a.status === 'REVISION_REQUIRED')
      .length,
    pendingApprovals: allApprovals.filter((a) => a.status === 'PENDING').length,
    completedDeliveries: allDeliveries.filter((d) => d.status === 'COMPLETED')
      .length,
    pendingQuotes: allQuotes.filter((q) => q.status === 'SENT').length,
  };
}
