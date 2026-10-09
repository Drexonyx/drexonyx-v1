// DR 0128: Sales entity DB writer for the orchestration layer.
// Called exclusively by the STATUS_TRANSITION and VERIFY step handlers in runner.ts.
// Only writes to the sales schema — never reads from or writes to other schemas.
// No UI, no external API calls, no email sends.
//
// HARD BOUNDARIES:
//   - DOES NOT send any message, email, or DM
//   - DOES NOT call any external service
//   - Standard cold email outreach receives approval_status NOT_REQUIRED (auto-sendable by cron)
//   - High-risk messages (proposals, pricing offers, sensitive content) receive PENDING

import { db } from '@/db/index';
import { salesLeads, leadSources, outreachMessages, followUps, outreachApprovals } from '@/db/schema/sales';
import { taskSteps } from '@/db/schema/orchestration';
import { eq, and, lt } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { getApprovalPolicy, type OutreachChannel } from '@/lib/sales/queries';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SalesWriterResult {
  ok: true;
  entityId: string;
  created: boolean;
}

export interface SalesWriterError {
  ok: false;
  error: string;
}

export type SalesWriterOutcome = SalesWriterResult | SalesWriterError;

// ── Deduplication check (for VERIFY SALES_DEDUP) ─────────────────────────────

/**
 * Returns true if a lead_source with this (platform, identifier) already exists.
 * Used by the VERIFY SALES_DEDUP step handler to prevent duplicate lead creation.
 */
export async function checkSalesDeduplicate(params: {
  platform: string;
  identifier: string;
}): Promise<boolean> {
  const rows = await db
    .select({ id: leadSources.id })
    .from(leadSources)
    .where(
      and(
        eq(leadSources.platform, params.platform),
        eq(leadSources.identifier, params.identifier),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

// ── Prior step output helpers ─────────────────────────────────────────────────

async function getPriorStepOutputs(taskId: string, currentStepIndex: number, organizationId: string) {
  const rows = await db
    .select({
      step_index: taskSteps.step_index,
      skill_id: taskSteps.skill_id,
      output: taskSteps.output,
    })
    .from(taskSteps)
    .where(
      and(
        eq(taskSteps.agent_task_id, taskId),
        eq(taskSteps.organization_id, organizationId),
        lt(taskSteps.step_index, currentStepIndex),
      ),
    );

  const bySkill: Record<string, Record<string, unknown>> = {};
  const byIndex: Record<number, Record<string, unknown>> = {};
  for (const row of rows) {
    const out = (row.output ?? {}) as Record<string, unknown>;
    byIndex[row.step_index] = out;
    if (row.skill_id) bySkill[row.skill_id] = out;
  }
  return { bySkill, byIndex };
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

export async function handleSalesStatusTransition(params: {
  entityType: string;
  entityId: string | undefined;
  newStatus: string;
  stepIndex: number;
  taskId: string;
  organizationId: string;
}): Promise<SalesWriterOutcome> {
  const { entityType, entityId, newStatus, stepIndex, taskId, organizationId } = params;

  const { bySkill, byIndex } = await getPriorStepOutputs(taskId, stepIndex, organizationId);

  switch (entityType) {
    case 'sales_lead':
      return handleSalesLead({ entityId, newStatus, bySkill, byIndex });

    case 'sales_outreach':
      return handleSalesOutreach({ entityId, newStatus, bySkill });

    case 'sales_followup':
      return handleSalesFollowUp({ entityId, newStatus, bySkill });

    default:
      return { ok: false, error: `Unknown sales entity type: ${entityType}` };
  }
}

// ── sales_lead handler ────────────────────────────────────────────────────────

async function handleSalesLead(params: {
  entityId: string | undefined;
  newStatus: string;
  bySkill: Record<string, Record<string, unknown>>;
  byIndex: Record<number, Record<string, unknown>>;
}): Promise<SalesWriterOutcome> {
  const { entityId, newStatus, bySkill } = params;

  // Creating a new lead from discovery skill output
  if (!entityId || newStatus === 'NEW') {
    const discoverOut = bySkill['sales.lead.discover'] ?? {};
    const businessName = (discoverOut.businessName as string | undefined) ?? '';
    if (!businessName) {
      return { ok: false, error: 'sales_lead create: businessName missing from discover skill output' };
    }

    const now = new Date();
    const leadId = uuidv7();

    await db.insert(salesLeads).values({
      id: leadId,
      business_name: businessName,
      full_name: (discoverOut.fullName as string | undefined) ?? null,
      country: (discoverOut.country as string | undefined) ?? null,
      city: (discoverOut.city as string | undefined) ?? null,
      website: (discoverOut.website as string | undefined) ?? null,
      public_email: (discoverOut.publicEmail as string | undefined) ?? null,
      public_contact_method: (discoverOut.publicContactMethod as string | undefined) ?? null,
      opportunity: (discoverOut.opportunity as string | undefined) ?? null,
      portfolio_match: (discoverOut.portfolioMatch as string | undefined) ?? null,
      notes: (discoverOut.notes as string | undefined) ?? null,
      primary_source_platform: (discoverOut.primarySourcePlatform as string | undefined) ?? 'unknown',
      primary_source_url: (discoverOut.primarySourceUrl as string | undefined) ?? null,
      source_type: (discoverOut.sourceType as string | undefined) ?? 'websearch',
      status: 'NEW',
      priority: 'COLD',
      lead_score: 0,
      discovered_by: 'agent',
      created_at: now,
      updated_at: now,
      last_activity_at: now,
    });

    return { ok: true, entityId: leadId, created: true };
  }

  // Updating an existing lead (from qualify or other flows)
  const qualifyOut = bySkill['sales.lead.qualify'] ?? {};
  const scoreOut = bySkill['sales.lead.score'] ?? {};
  const now = new Date();

  const updates: Partial<typeof salesLeads.$inferInsert> = {
    status: newStatus as typeof salesLeads.$inferInsert['status'],
    updated_at: now,
    last_activity_at: now,
  };

  // Apply score + priority from score skill if available
  if (typeof scoreOut.score === 'number') {
    updates.lead_score = scoreOut.score;
  }
  if (scoreOut.priority === 'HOT' || scoreOut.priority === 'WARM' || scoreOut.priority === 'COLD') {
    updates.priority = scoreOut.priority as 'HOT' | 'WARM' | 'COLD';
  }

  // Apply qualification notes
  if (typeof qualifyOut.qualificationReason === 'string') {
    updates.notes = qualifyOut.qualificationReason;
  }

  await db
    .update(salesLeads)
    .set(updates)
    .where(eq(salesLeads.id, entityId));

  return { ok: true, entityId, created: false };
}

// ── sales_outreach handler ────────────────────────────────────────────────────

async function handleSalesOutreach(params: {
  entityId: string | undefined;
  newStatus: string;
  bySkill: Record<string, Record<string, unknown>>;
}): Promise<SalesWriterOutcome> {
  const { entityId, newStatus, bySkill } = params;

  const draftOut = bySkill['sales.outreach.draft'] ?? {};
  const messageText = (draftOut.messageText as string | undefined) ?? '';
  const channel = (draftOut.channel as string | undefined) ?? 'email';
  const messageType = (draftOut.messageType as string | undefined) ?? 'cold_outreach';

  // Use approval status from draft skill if set; otherwise derive from policy
  const computedPolicy = getApprovalPolicy({
    channel: channel as OutreachChannel,
    messageType,
    hasDiscount: false,
    hasContractualCommitment: false,
    hasPricingOffer: false,
    isSensitiveContent: false,
  });
  const approvalStatus = (draftOut.approvalStatus as string | undefined) ?? computedPolicy;

  if (!messageText) {
    return { ok: false, error: 'sales_outreach create: messageText missing from draft skill output' };
  }

  // entityId for outreach is the lead_id (passed in the step input or context)
  const leadId = entityId;
  if (!leadId) {
    return { ok: false, error: 'sales_outreach create: entityId (lead_id) is required' };
  }

  const now = new Date();
  const outreachId = uuidv7();

  await db.insert(outreachMessages).values({
    id: outreachId,
    lead_id: leadId,
    channel: channel as typeof outreachMessages.$inferInsert['channel'],
    message_text: messageText,
    message_type: messageType as typeof outreachMessages.$inferInsert['message_type'],
    status: newStatus as typeof outreachMessages.$inferInsert['status'],
    approval_status: approvalStatus as typeof outreachMessages.$inferInsert['approval_status'],
    created_at: now,
    updated_at: now,
  });

  // If approval is required, also create an outreach_approval record
  if (approvalStatus === 'PENDING') {
    const approvalType = (draftOut.approvalType as string | undefined) ?? 'OUTREACH';
    await db.insert(outreachApprovals).values({
      id: uuidv7(),
      lead_id: leadId,
      outreach_id: outreachId,
      approval_type: approvalType as typeof outreachApprovals.$inferInsert['approval_type'],
      reason: 'Agent-drafted outreach pending human review',
      status: 'PENDING',
      requested_at: now,
      created_at: now,
    });
  }

  return { ok: true, entityId: outreachId, created: true };
}

// ── sales_followup handler ────────────────────────────────────────────────────

async function handleSalesFollowUp(params: {
  entityId: string | undefined;
  newStatus: string;
  bySkill: Record<string, Record<string, unknown>>;
}): Promise<SalesWriterOutcome> {
  const { entityId, newStatus, bySkill } = params;

  const qualifyOut = bySkill['sales.lead.qualify'] ?? {};
  const recommendedChannel = (qualifyOut.recommendedChannel as string | undefined) ?? 'email';

  // entityId is the lead_id
  const leadId = entityId;
  if (!leadId) {
    return { ok: false, error: 'sales_followup create: entityId (lead_id) is required' };
  }

  const now = new Date();
  const followUpId = uuidv7();

  // Default follow-up in 3 days
  const scheduledAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  await db.insert(followUps).values({
    id: followUpId,
    lead_id: leadId,
    channel: recommendedChannel as typeof followUps.$inferInsert['channel'],
    scheduled_at: scheduledAt,
    status: newStatus as typeof followUps.$inferInsert['status'],
    created_at: now,
    updated_at: now,
  });

  return { ok: true, entityId: followUpId, created: true };
}
