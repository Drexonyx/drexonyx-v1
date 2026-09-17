// Site Audit Specialist Agent — DR 0122
// Deterministic, read-only content health inspection of DREXONYX's own public website.
//
// CONSTRAINTS (DR 0122, DR 0071):
//   - READ ONLY on lib/portfolio.ts and lib/pricing.ts — no writes, no DB access
//   - No autonomous publishing or deployment
//   - No content generation — agent NEVER invents, fabricates, or suggests content
//   - HUMAN_GATE mandatory before any proposed change reaches production state
//   - No external API calls
//   - No AGENT_ALLOWLIST expansion; uses existing VERIFY, HUMAN_GATE, NOTIFICATION only
//   - Initiator roles: OWNER, ADMIN_OPERATIONS only

import { delegateSubTask } from '@/lib/orchestration/delegation';
import type { InitiatorRole, TaskContext } from '@/lib/orchestration/types';

export interface SiteAuditDelegationParams {
  parentTaskId: string;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: Extract<InitiatorRole, 'OWNER' | 'ADMIN_OPERATIONS'>;
  context?: TaskContext;
}

export type SiteAuditDelegationResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

export async function delegateSiteAudit(
  params: SiteAuditDelegationParams,
): Promise<SiteAuditDelegationResult> {
  const {
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    context,
  } = params;

  const allowedRoles: ReadonlyArray<string> = ['OWNER', 'ADMIN_OPERATIONS'];
  if (!allowedRoles.includes(initiatorRole)) {
    return {
      ok: false,
      error: 'Site audit may only be initiated by OWNER or ADMIN_OPERATIONS',
    };
  }

  // DR 0122 §2.6: three-step plan
  // Step 0: VERIFY — deterministic content health inspection (read-only)
  // Step 1: HUMAN_GATE — OWNER/ADMIN_OPERATIONS reviews findings before any change proceeds
  // Step 2: NOTIFICATION — internal alert on audit completion
  const plan = {
    steps: [
      {
        step_index: 0,
        step_type: 'VERIFY' as const,
        input: { reportType: 'WEBSITE_CONTENT_AUDIT' },
      },
      {
        step_index: 1,
        step_type: 'HUMAN_GATE' as const,
        input: {
          gate: 'WEBSITE_CONTENT_REVIEW',
          requiredRoles: ['OWNER', 'ADMIN_OPERATIONS'],
        },
      },
      {
        step_index: 2,
        step_type: 'NOTIFICATION' as const,
        input: {
          eventType: 'REPORT_READY',
          title: 'Website Content Audit Complete',
          detail: 'DREXONYX website content audit has completed and is ready for review.',
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
    intentType: 'AUDIT_WEBSITE_CONTENT',
    title: 'DREXONYX website content audit',
    context: context ?? {},
    plan,
  });

  return result;
}
