// Website Production Specialist Agent — DR 0121
// Coordinates CLIENT WEBSITE production: brief validation → budget check →
// production authorization → production job → QC → delivery approval → notification.
//
// CONSTRAINTS (DR 0121, DR 0071, DR 0080, DR 0090):
//   - READ ONLY on commercial schema — no writes to campaigns, briefs, orders
//   - FINANCIAL_CHECK before any production cost (no autonomous spending)
//   - HUMAN_GATE before production job (DR 0080 §2.1 mandatory)
//   - QC_GATE is architecturally mandatory — cannot be bypassed (DR 0090 §2.2)
//   - HUMAN_GATE before delivery/publish (DR 0035)
//   - No autonomous client approval or delivery/publish
//   - No AGENT_ALLOWLIST expansion; uses existing step types only
//   - No DREXONYX public website modifications
//   - No external API calls, no autonomous AI generation
//   - Initiator roles: OWNER, ADMIN_OPERATIONS only

import { delegateSubTask } from '@/lib/orchestration/delegation';
import type { InitiatorRole, TaskContext } from '@/lib/orchestration/types';

export interface WebsiteProductionDelegationParams {
  parentTaskId: string;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: Extract<InitiatorRole, 'OWNER' | 'ADMIN_OPERATIONS'>;
  campaignId: string;
  orderId: string;
  briefId: string;
  context?: TaskContext;
}

export type WebsiteProductionDelegationResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

export async function delegateWebsiteProduction(
  params: WebsiteProductionDelegationParams,
): Promise<WebsiteProductionDelegationResult> {
  const {
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    campaignId,
    orderId,
    briefId,
    context,
  } = params;

  const allowedRoles: ReadonlyArray<string> = ['OWNER', 'ADMIN_OPERATIONS'];
  if (!allowedRoles.includes(initiatorRole)) {
    return {
      ok: false,
      error: 'Website production may only be initiated by OWNER or ADMIN_OPERATIONS',
    };
  }
  if (!campaignId || typeof campaignId !== 'string') {
    return { ok: false, error: 'campaignId must be a non-empty string' };
  }
  if (!orderId || typeof orderId !== 'string') {
    return { ok: false, error: 'orderId must be a non-empty string' };
  }
  if (!briefId || typeof briefId !== 'string') {
    return { ok: false, error: 'briefId must be a non-empty string' };
  }

  // DR 0121 §2.4: seven-step deterministic plan
  // Step 0: VERIFY — read-only validation (brief + order + campaign must exist)
  // Step 1: FINANCIAL_CHECK — confirm budget before any production cost
  // Step 2: HUMAN_GATE — production authorization (OWNER/ADMIN_OPERATIONS required)
  // Step 3: PRODUCTION_JOB — website production job (MANUAL_UPLOAD, org-scoped)
  // Step 4: QC_GATE — mandatory QC verdict before preview/delivery (DR 0090 §2.2)
  // Step 5: HUMAN_GATE — delivery approval before publish (DR 0035)
  // Step 6: NOTIFICATION — internal completion alert
  const plan = {
    steps: [
      {
        step_index: 0,
        step_type: 'VERIFY' as const,
        input: {
          reportType: 'WEBSITE_PRODUCTION_BRIEF_VALIDATION',
          campaignId,
          orderId,
          briefId,
        },
      },
      {
        step_index: 1,
        step_type: 'FINANCIAL_CHECK' as const,
        input: { orderId },
      },
      {
        step_index: 2,
        step_type: 'HUMAN_GATE' as const,
        input: {
          gate: 'WEBSITE_PRODUCTION_AUTHORIZATION',
          orderId,
          briefId,
          requiredRoles: ['OWNER', 'ADMIN_OPERATIONS'],
        },
      },
      {
        step_index: 3,
        step_type: 'PRODUCTION_JOB' as const,
        input: { orderId, jobType: 'MANUAL_UPLOAD' },
      },
      {
        step_index: 4,
        step_type: 'QC_GATE' as const,
        // DR 0090 §2.2: gate resolved only by authorized human — agent cannot approve
        input: { orderId, requiredRoles: ['OWNER', 'ADMIN_OPERATIONS', 'QC'] },
      },
      {
        step_index: 5,
        step_type: 'HUMAN_GATE' as const,
        input: {
          gate: 'WEBSITE_DELIVERY_APPROVAL',
          orderId,
          requiredRoles: ['OWNER', 'ADMIN_OPERATIONS'],
        },
      },
      {
        step_index: 6,
        step_type: 'NOTIFICATION' as const,
        input: {
          eventType: 'REPORT_READY',
          title: 'Website Production Complete',
          detail: 'Client website production has completed all stages and is ready for delivery.',
          entityId: orderId,
          entityType: 'Order',
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
    intentType: 'COORDINATE_WEBSITE_PRODUCTION',
    title: `Website production: order ${orderId}`,
    context: context ?? { campaign_id: campaignId, order_id: orderId, brief_id: briefId },
    plan,
  });

  return result;
}
