import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db/index';
import { organizations } from '@/db/schema/core';
import { users, orgMemberships } from '@/db/schema/identity';
import { campaigns, quotes, orders, orderBudgets, pricingConfigs, inquiries } from '@/db/schema/commercial';
import { payments, financialLedger, expenses } from '@/db/schema/financial';
import { assets, qcReviews, approvals, deliveries, productionJobs, aiGenerations, deliveryAssets } from '@/db/schema/production';
import { auditEvents } from '@/db/schema/system';

// All queries are scoped to the authenticated admin's organizationId from the
// server-side session. organizationId must never come from client-controlled input.
// password_hash is never queried or returned anywhere in this file.
// Admin queries expose full internal visibility — no CLIENT-safe filtering applied.

export async function getAdminOrganization(organizationId: string) {
  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      archived_at: organizations.archived_at,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAdminMembers(organizationId: string) {
  return db
    .select({
      membershipId: orgMemberships.id,
      userId: orgMemberships.user_id,
      role: orgMemberships.role,
      archived_at: orgMemberships.archived_at,
      email: users.email,
      display_name: users.display_name,
      user_archived_at: users.archived_at,
      created_at: orgMemberships.created_at,
    })
    .from(orgMemberships)
    .innerJoin(users, eq(orgMemberships.user_id, users.id))
    .where(eq(orgMemberships.organization_id, organizationId))
    .orderBy(orgMemberships.role, users.email);
}

export async function getAdminCampaigns(organizationId: string) {
  return db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      archived_at: campaigns.archived_at,
      created_at: campaigns.created_at,
      updated_at: campaigns.updated_at,
    })
    .from(campaigns)
    .where(eq(campaigns.organization_id, organizationId))
    .orderBy(desc(campaigns.created_at));
}

// Admin sees ALL quote statuses including DRAFT (portal CLIENT view excludes DRAFT).
// DR 0043: includes estimated_cost and currency for cost/margin check display.
export async function getAdminQuotes(organizationId: string) {
  return db
    .select({
      id: quotes.id,
      campaign_id: quotes.campaign_id,
      status: quotes.status,
      total_amount: quotes.total_amount,
      estimated_cost: quotes.estimated_cost,
      currency: quotes.currency,
      archived_at: quotes.archived_at,
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
}

// DR 0043 §6.5: Fetch org-level pricing config for margin threshold display.
export async function getAdminPricingConfig(organizationId: string) {
  const rows = await db
    .select({
      minimum_acceptable_margin_rate: pricingConfigs.minimum_acceptable_margin_rate,
      target_margin_rate: pricingConfigs.target_margin_rate,
    })
    .from(pricingConfigs)
    .where(eq(pricingConfigs.organization_id, organizationId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAdminOrders(organizationId: string) {
  return db
    .select({
      id: orders.id,
      campaign_id: orders.campaign_id,
      quote_id: orders.quote_id,
      status: orders.status,
      archived_at: orders.archived_at,
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

// Admin sees ALL asset statuses (portal CLIENT view is limited to CLIENT_PREVIEW, REVISION_REQUIRED).
export async function getAdminAssets(organizationId: string) {
  return db
    .select({
      id: assets.id,
      order_id: assets.order_id,
      status: assets.status,
      name: assets.name,
      file_key: assets.file_key,
      file_type: assets.file_type,
      file_size: assets.file_size,
      // DR 0054 §2.4: content_url is temporary placeholder only — not a stable reference
      content_url: assets.content_url,
      archived_at: assets.archived_at,
      created_at: assets.created_at,
      updated_at: assets.updated_at,
    })
    .from(assets)
    .where(eq(assets.organization_id, organizationId))
    .orderBy(desc(assets.updated_at));
}

// DR 0092 §2.9, DR 0093 §2.10: Returns UPLOADED and REVISION_REQUIRED non-archived assets
// for the MANUAL_UPLOAD workflow and revision initiation UI surfaces.
export async function getAdminAssetsForWorkflow(organizationId: string) {
  return db
    .select({
      id: assets.id,
      order_id: assets.order_id,
      status: assets.status,
      name: assets.name,
      archived_at: assets.archived_at,
      created_at: assets.created_at,
      updated_at: assets.updated_at,
    })
    .from(assets)
    .where(
      and(
        eq(assets.organization_id, organizationId),
        isNull(assets.archived_at),
        inArray(assets.status, ['UPLOADED', 'REVISION_REQUIRED']),
      ),
    )
    .orderBy(desc(assets.updated_at));
}

export async function getAdminQcReviews(organizationId: string) {
  return db
    .select({
      id: qcReviews.id,
      asset_id: qcReviews.asset_id,
      reviewer_id: qcReviews.reviewer_id,
      verdict: qcReviews.verdict,
      notes: qcReviews.notes,
      created_at: qcReviews.created_at,
    })
    .from(qcReviews)
    .where(eq(qcReviews.organization_id, organizationId))
    .orderBy(desc(qcReviews.created_at));
}

export async function getAdminApprovals(organizationId: string) {
  return db
    .select({
      id: approvals.id,
      order_id: approvals.order_id,
      target_type: approvals.target_type,
      target_id: approvals.target_id,
      status: approvals.status,
      created_by_user_id: approvals.created_by_user_id,
      decided_by_user_id: approvals.decided_by_user_id,
      expires_at: approvals.expires_at,
      archived_at: approvals.archived_at,
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

export async function getAdminDeliveries(organizationId: string) {
  return db
    .select({
      id: deliveries.id,
      order_id: deliveries.order_id,
      status: deliveries.status,
      failure_reason: deliveries.failure_reason,
      archived_at: deliveries.archived_at,
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

export async function getAdminProductionJobs(organizationId: string) {
  return db
    .select({
      id: productionJobs.id,
      order_id: productionJobs.order_id,
      job_type: productionJobs.job_type,
      description: productionJobs.description,
      status: productionJobs.status,
      archived_at: productionJobs.archived_at,
      created_at: productionJobs.created_at,
      updated_at: productionJobs.updated_at,
    })
    .from(productionJobs)
    .where(eq(productionJobs.organization_id, organizationId))
    .orderBy(desc(productionJobs.created_at));
}

export async function getAdminAiGenerations(organizationId: string) {
  return db
    .select({
      id: aiGenerations.id,
      production_job_id: aiGenerations.production_job_id,
      provider: aiGenerations.provider,
      model: aiGenerations.model,
      status: aiGenerations.status,
      created_at: aiGenerations.created_at,
      updated_at: aiGenerations.updated_at,
    })
    .from(aiGenerations)
    .where(eq(aiGenerations.organization_id, organizationId))
    .orderBy(desc(aiGenerations.created_at));
}

export async function getAdminDeliveryAssets(organizationId: string, deliveryId: string) {
  return db
    .select({
      delivery_id: deliveryAssets.delivery_id,
      asset_id: deliveryAssets.asset_id,
      created_at: deliveryAssets.created_at,
    })
    .from(deliveryAssets)
    .where(
      and(
        eq(deliveryAssets.delivery_id, deliveryId),
        eq(deliveryAssets.organization_id, organizationId),
      ),
    );
}

// Payments — admin read-only visibility. No mutation.
export async function getAdminPayments(organizationId: string) {
  return db
    .select({
      id: payments.id,
      order_id: payments.order_id,
      amount: payments.amount,
      currency: payments.currency,
      status: payments.status,
      idempotency_key: payments.idempotency_key,
      created_at: payments.created_at,
    })
    .from(payments)
    .where(eq(payments.organization_id, organizationId))
    .orderBy(desc(payments.created_at));
}

// Financial ledger — admin read-only. No mutation.
export async function getAdminFinancialLedger(organizationId: string) {
  return db
    .select({
      id: financialLedger.id,
      entry_type: financialLedger.entry_type,
      amount: financialLedger.amount,
      currency: financialLedger.currency,
      reference_entity_type: financialLedger.reference_entity_type,
      reference_entity_id: financialLedger.reference_entity_id,
      description: financialLedger.description,
      created_at: financialLedger.created_at,
    })
    .from(financialLedger)
    .where(eq(financialLedger.organization_id, organizationId))
    .orderBy(desc(financialLedger.created_at))
    .limit(200);
}

// Expenses — admin read-only.
export async function getAdminExpenses(organizationId: string) {
  return db
    .select({
      id: expenses.id,
      order_budget_id: expenses.order_budget_id,
      amount: expenses.amount,
      currency: expenses.currency,
      expense_type: expenses.expense_type,
      description: expenses.description,
      created_at: expenses.created_at,
    })
    .from(expenses)
    .where(eq(expenses.organization_id, organizationId))
    .orderBy(desc(expenses.created_at))
    .limit(200);
}

// Audit events — admin read access (DR 0002 §6 polymorphic model).
export async function getAdminAuditEvents(organizationId: string) {
  return db
    .select({
      id: auditEvents.id,
      entity_type: auditEvents.entity_type,
      entity_id: auditEvents.entity_id,
      actor_id: auditEvents.actor_id,
      actor_role: auditEvents.actor_role,
      action: auditEvents.action,
      payload: auditEvents.payload,
      created_at: auditEvents.created_at,
    })
    .from(auditEvents)
    .where(eq(auditEvents.organization_id, organizationId))
    .orderBy(desc(auditEvents.created_at))
    .limit(200);
}

// Inquiries — pre-org intake records; no organization_id scope.
export async function getAdminInquiries() {
  return db
    .select({
      id: inquiries.id,
      status: inquiries.status,
      brand_name: inquiries.brand_name,
      contact_email: inquiries.contact_email,
      website: inquiries.website,
      campaign_objective: inquiries.campaign_objective,
      target_audience: inquiries.target_audience,
      creative_types: inquiries.creative_types,
      platforms: inquiries.platforms,
      additional_notes: inquiries.additional_notes,
      submitted_at: inquiries.submitted_at,
      created_at: inquiries.created_at,
      updated_at: inquiries.updated_at,
    })
    .from(inquiries)
    .orderBy(desc(inquiries.submitted_at))
    .limit(500);
}

// Admin dashboard summary counts — full internal visibility.
export async function getAdminDashboardCounts(organizationId: string) {
  const [
    allCampaigns,
    allQuotes,
    allOrders,
    allAssets,
    allQcReviews,
    allApprovals,
    allDeliveries,
    allPayments,
    allInquiries,
  ] = await Promise.all([
    getAdminCampaigns(organizationId),
    getAdminQuotes(organizationId),
    getAdminOrders(organizationId),
    getAdminAssets(organizationId),
    getAdminQcReviews(organizationId),
    getAdminApprovals(organizationId),
    getAdminDeliveries(organizationId),
    getAdminPayments(organizationId),
    getAdminInquiries(),
  ]);

  return {
    newInquiries: allInquiries.filter((i) => i.status === 'NEW').length,
    campaigns: allCampaigns.filter((c) => !c.archived_at).length,
    quoteDrafts: allQuotes.filter((q) => q.status === 'DRAFT').length,
    quoteSent: allQuotes.filter((q) => q.status === 'SENT').length,
    ordersActive: allOrders.filter((o) => o.status === 'ACTIVE').length,
    assetsReadyForQc: allAssets.filter((a) => a.status === 'READY_FOR_QC' && !a.archived_at).length,
    qcFails: allQcReviews.filter((q) => q.verdict === 'FAIL').length,
    pendingApprovals: allApprovals.filter((a) => a.status === 'PENDING').length,
    deliveriesInProgress: allDeliveries.filter(
      (d) => d.status === 'PREPARING' || d.status === 'SENDING',
    ).length,
    paymentsPending: allPayments.filter((p) => p.status === 'PENDING').length,
  };
}

// Order budgets — for financial context.
export async function getAdminOrderBudgets(organizationId: string) {
  return db
    .select({
      id: orderBudgets.id,
      order_id: orderBudgets.order_id,
      planned_amount: orderBudgets.planned_amount,
      estimated_amount: orderBudgets.estimated_amount,
      actual_amount: orderBudgets.actual_amount,
      created_at: orderBudgets.created_at,
      updated_at: orderBudgets.updated_at,
    })
    .from(orderBudgets)
    .where(eq(orderBudgets.organization_id, organizationId))
    .orderBy(desc(orderBudgets.created_at));
}
