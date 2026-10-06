// Sales Discovery Specialist Agent — DR 0128
// Connects the MDA Sales Operating System to the existing orchestration architecture.
// Provides four delegate functions covering the full lead lifecycle (discover → qualify → outreach → follow-up).
//
// HARD BOUNDARIES (DR 0128, DR 0001):
//   - DOES NOT send any message, email, DM, or outreach of any kind
//   - DOES NOT call any external API (social, LinkedIn, Instagram, WhatsApp, email)
//   - DOES NOT auto-approve outreach — all proposals require HUMAN_GATE
//   - DOES NOT access contact_email / personal phone (PII boundary)
//   - Social platforms: profile/page data only, no API automation
//   - Phase 3 constraint: zero real outreach until Phase 4 explicit approval
//   - Initiator roles: OWNER, ADMIN_OPERATIONS only

import { delegateSubTask } from '@/lib/orchestration/delegation';
import type { InitiatorRole, TaskContext } from '@/lib/orchestration/types';

type SalesInitiatorRole = Extract<InitiatorRole, 'OWNER' | 'ADMIN_OPERATIONS'>;

const ALLOWED_ROLES: ReadonlyArray<string> = ['OWNER', 'ADMIN_OPERATIONS'];

function checkRole(role: string): boolean {
  return ALLOWED_ROLES.includes(role);
}

// ── Lead Discovery ────────────────────────────────────────────────────────────

export interface LeadDiscoveryParams {
  parentTaskId: string | null;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: SalesInitiatorRole;
  rawData: string;
  primarySourcePlatform: string;
  primarySourceUrl?: string;
  sourceType: 'social_profile' | 'website' | 'directory' | 'websearch' | 'referral' | 'manual';
  dedupIdentifier?: string;
  context?: TaskContext;
}

export type LeadDiscoveryResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

export async function delegateLeadDiscovery(
  params: LeadDiscoveryParams,
): Promise<LeadDiscoveryResult> {
  if (!checkRole(params.initiatorRole)) {
    return { ok: false, error: 'Sales Discovery may only be initiated by OWNER or ADMIN_OPERATIONS' };
  }

  const hasDedupInfo = !!(params.dedupIdentifier && params.primarySourcePlatform);

  const plan = {
    steps: [
      {
        step_index: 0,
        step_type: 'VERIFY' as const,
        input: {
          check_type: 'SALES_DEDUP',
          ...(hasDedupInfo ? {
            platform: params.primarySourcePlatform,
            identifier: params.dedupIdentifier,
          } : { result: 'PASS' }),
        },
      },
      {
        step_index: 1,
        step_type: 'SKILL' as const,
        skill_id: 'sales.lead.discover',
        input: {
          rawData: params.rawData,
          primarySourcePlatform: params.primarySourcePlatform,
          ...(params.primarySourceUrl ? { primarySourceUrl: params.primarySourceUrl } : {}),
          sourceType: params.sourceType,
        },
      },
      {
        step_index: 2,
        step_type: 'STATUS_TRANSITION' as const,
        input: {
          entity_type: 'sales_lead',
          new_status: 'NEW',
        },
      },
      {
        step_index: 3,
        step_type: 'NOTIFICATION' as const,
        input: {
          notification_type: 'SYSTEM',
          eventType: 'LEAD_DISCOVERED',
          title: 'New Sales Lead Discovered',
        },
      },
    ],
    generated_at: new Date().toISOString(),
  };

  const result = await delegateSubTask({
    parentTaskId: params.parentTaskId,
    organizationId: params.organizationId,
    initiatedByUserId: params.initiatedByUserId,
    initiatorRole: params.initiatorRole,
    intentType: 'DISCOVER_SALES_LEAD',
    title: `Discover lead: ${params.primarySourcePlatform}`,
    context: params.context ?? {},
    plan,
  });

  return result;
}

// ── Lead Qualification ────────────────────────────────────────────────────────

export interface LeadQualificationParams {
  parentTaskId: string | null;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: SalesInitiatorRole;
  leadId: string;
  businessName: string;
  primarySourcePlatform?: string;
  primarySourceUrl?: string;
  website?: string;
  publicEmail?: string;
  notes?: string;
  context?: TaskContext;
}

export type LeadQualificationResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

export async function delegateLeadQualification(
  params: LeadQualificationParams,
): Promise<LeadQualificationResult> {
  if (!checkRole(params.initiatorRole)) {
    return { ok: false, error: 'Sales Qualification may only be initiated by OWNER or ADMIN_OPERATIONS' };
  }

  const plan = {
    steps: [
      {
        step_index: 0,
        step_type: 'SKILL' as const,
        skill_id: 'sales.lead.verify',
        input: {
          businessName: params.businessName,
          primarySourcePlatform: params.primarySourcePlatform ?? '',
          ...(params.primarySourceUrl ? { primarySourceUrl: params.primarySourceUrl } : {}),
          ...(params.website ? { website: params.website } : {}),
          ...(params.publicEmail ? { publicEmail: params.publicEmail } : {}),
          ...(params.notes ? { notes: params.notes } : {}),
        },
      },
      {
        step_index: 1,
        step_type: 'SKILL' as const,
        skill_id: 'sales.lead.score',
        input: {
          businessName: params.businessName,
          primarySourcePlatform: params.primarySourcePlatform ?? '',
        },
      },
      {
        step_index: 2,
        step_type: 'SKILL' as const,
        skill_id: 'sales.lead.qualify',
        input: {
          businessName: params.businessName,
          ...(params.primarySourcePlatform ? { primarySourcePlatform: params.primarySourcePlatform } : {}),
          ...(params.notes ? { notes: params.notes } : {}),
        },
      },
      {
        step_index: 3,
        step_type: 'STATUS_TRANSITION' as const,
        input: {
          entity_type: 'sales_lead',
          entity_id: params.leadId,
          new_status: 'QUALIFIED',
        },
      },
      {
        step_index: 4,
        step_type: 'NOTIFICATION' as const,
        input: {
          notification_type: 'SYSTEM',
          eventType: 'LEAD_QUALIFIED',
          title: `Lead Qualified: ${params.businessName}`,
        },
      },
    ],
    generated_at: new Date().toISOString(),
  };

  const result = await delegateSubTask({
    parentTaskId: params.parentTaskId,
    organizationId: params.organizationId,
    initiatedByUserId: params.initiatedByUserId,
    initiatorRole: params.initiatorRole,
    intentType: 'QUALIFY_SALES_LEAD',
    title: `Qualify lead: ${params.businessName}`,
    context: params.context ?? {},
    plan,
  });

  return result;
}

// ── Outreach Drafting ─────────────────────────────────────────────────────────
// HARD BOUNDARY: drafts message only — NO sending in Phase 3.
// HUMAN_GATE step requires human approval before any outreach is sent.

export interface OutreachDraftingParams {
  parentTaskId: string | null;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: SalesInitiatorRole;
  leadId: string;
  businessName: string;
  channel: 'email' | 'instagram' | 'whatsapp' | 'linkedin' | 'manual';
  messageType: 'cold_outreach' | 'follow_up' | 'proposal';
  opportunity?: string;
  portfolioMatch?: string;
  notes?: string;
  context?: TaskContext;
}

export type OutreachDraftingResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

export async function delegateOutreachDrafting(
  params: OutreachDraftingParams,
): Promise<OutreachDraftingResult> {
  if (!checkRole(params.initiatorRole)) {
    return { ok: false, error: 'Sales Outreach Drafting may only be initiated by OWNER or ADMIN_OPERATIONS' };
  }

  const plan = {
    steps: [
      {
        step_index: 0,
        step_type: 'SKILL' as const,
        skill_id: 'sales.outreach.draft',
        input: {
          businessName: params.businessName,
          channel: params.channel,
          messageType: params.messageType,
          ...(params.opportunity ? { opportunity: params.opportunity } : {}),
          ...(params.portfolioMatch ? { portfolioMatch: params.portfolioMatch } : {}),
          ...(params.notes ? { notes: params.notes } : {}),
        },
      },
      {
        step_index: 1,
        step_type: 'STATUS_TRANSITION' as const,
        input: {
          entity_type: 'sales_outreach',
          entity_id: params.leadId,
          new_status: 'DRAFT',
        },
      },
      {
        step_index: 2,
        step_type: 'HUMAN_GATE' as const,
        input: {
          required_roles: ['OWNER', 'ADMIN_OPERATIONS'],
          reason: 'Human approval required before any outreach is sent (DR 0128)',
          gate_type: 'OUTREACH_APPROVAL',
        },
      },
      {
        step_index: 3,
        step_type: 'NOTIFICATION' as const,
        input: {
          notification_type: 'SYSTEM',
          eventType: 'OUTREACH_DRAFTED',
          title: `Outreach Draft Ready: ${params.businessName}`,
          detail: 'Outreach message drafted and awaiting human approval.',
        },
      },
    ],
    generated_at: new Date().toISOString(),
  };

  const result = await delegateSubTask({
    parentTaskId: params.parentTaskId,
    organizationId: params.organizationId,
    initiatedByUserId: params.initiatedByUserId,
    initiatorRole: params.initiatorRole,
    intentType: 'DRAFT_SALES_OUTREACH',
    title: `Draft outreach: ${params.businessName}`,
    context: params.context ?? {},
    plan,
  });

  return result;
}

// ── Follow-Up Scheduling ──────────────────────────────────────────────────────
// Schedules a follow-up record only. DOES NOT send any message.

export interface FollowUpSchedulingParams {
  parentTaskId: string | null;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: SalesInitiatorRole;
  leadId: string;
  businessName: string;
  primarySourcePlatform?: string;
  opportunity?: string;
  portfolioMatch?: string;
  notes?: string;
  context?: TaskContext;
}

export type FollowUpSchedulingResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

export async function delegateFollowUpScheduling(
  params: FollowUpSchedulingParams,
): Promise<FollowUpSchedulingResult> {
  if (!checkRole(params.initiatorRole)) {
    return { ok: false, error: 'Follow-Up Scheduling may only be initiated by OWNER or ADMIN_OPERATIONS' };
  }

  const plan = {
    steps: [
      {
        step_index: 0,
        step_type: 'SKILL' as const,
        skill_id: 'sales.lead.qualify',
        input: {
          businessName: params.businessName,
          ...(params.primarySourcePlatform ? { primarySourcePlatform: params.primarySourcePlatform } : {}),
          ...(params.opportunity ? { opportunity: params.opportunity } : {}),
          ...(params.portfolioMatch ? { portfolioMatch: params.portfolioMatch } : {}),
          ...(params.notes ? { notes: params.notes } : {}),
        },
      },
      {
        step_index: 1,
        step_type: 'STATUS_TRANSITION' as const,
        input: {
          entity_type: 'sales_followup',
          entity_id: params.leadId,
          new_status: 'PENDING',
        },
      },
      {
        step_index: 2,
        step_type: 'NOTIFICATION' as const,
        input: {
          notification_type: 'SYSTEM',
          eventType: 'FOLLOW_UP_SCHEDULED',
          title: `Follow-Up Scheduled: ${params.businessName}`,
        },
      },
    ],
    generated_at: new Date().toISOString(),
  };

  const result = await delegateSubTask({
    parentTaskId: params.parentTaskId,
    organizationId: params.organizationId,
    initiatedByUserId: params.initiatedByUserId,
    initiatorRole: params.initiatorRole,
    intentType: 'SCHEDULE_SALES_FOLLOWUP',
    title: `Schedule follow-up: ${params.businessName}`,
    context: params.context ?? {},
    plan,
  });

  return result;
}
