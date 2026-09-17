// Lead Hunter Specialist Agent — DR 0120
// Read-only lead pipeline intelligence for OWNER and ADMIN_OPERATIONS.
//
// CONSTRAINTS (DR 0120, DR 0001, DR 0052):
//   - READ ONLY — no writes to any business table
//   - contact_email NEVER appears in any output (PII boundary DR 0120 §2.2)
//   - No cold outreach, scraping, LinkedIn/social, email campaigns, WhatsApp
//   - No autonomous client communication
//   - No external API calls, no invented lead scores
//   - No AGENT_ALLOWLIST expansion; uses existing VERIFY + NOTIFICATION step types only
//   - commercial.inquiries has no organization_id (pre-org, DR 0106); auth at agent layer
//   - Initiator roles: OWNER, ADMIN_OPERATIONS only

import { delegateSubTask } from '@/lib/orchestration/delegation';
import type { InitiatorRole, TaskContext } from '@/lib/orchestration/types';

export interface LeadHunterDelegationParams {
  parentTaskId: string;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: Extract<InitiatorRole, 'OWNER' | 'ADMIN_OPERATIONS'>;
  windowDays?: number;
  context?: TaskContext;
}

export type LeadHunterDelegationResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

export async function delegateLeadHunter(
  params: LeadHunterDelegationParams,
): Promise<LeadHunterDelegationResult> {
  const {
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    windowDays,
    context,
  } = params;

  const allowedRoles: ReadonlyArray<string> = ['OWNER', 'ADMIN_OPERATIONS'];
  if (!allowedRoles.includes(initiatorRole)) {
    return {
      ok: false,
      error: 'Lead Hunter may only be initiated by OWNER or ADMIN_OPERATIONS',
    };
  }

  // DR 0120 §2.5: VERIFY (pipeline query + classification) → NOTIFICATION (alert if actionable)
  const plan = {
    steps: [
      {
        step_index: 0,
        step_type: 'VERIFY' as const,
        input: {
          reportType: 'LEAD_HUNTER_REPORT',
          ...(windowDays !== undefined ? { windowDays } : {}),
        },
      },
      {
        step_index: 1,
        step_type: 'NOTIFICATION' as const,
        input: {
          eventType: 'REPORT_READY',
          title: 'Lead Hunter Report',
          detail: 'Lead pipeline intelligence report is ready for review.',
        },
      },
    ],
    generated_at: new Date().toISOString(),
  };

  const result = await delegateSubTask({
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    intentType: 'HUNT_LEADS',
    title: 'Lead Hunter Report',
    context: context ?? {},
    plan,
  });

  return result;
}
