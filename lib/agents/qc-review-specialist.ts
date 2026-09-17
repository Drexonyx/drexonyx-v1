// QC Review Specialist Agent — DR 0114
// Coordinates QC skill sub-tasks (machine recommendations) and enforces mandatory
// human QC_GATE before any asset status transition.
//
// CONSTRAINTS (DR 0114, DR 0090):
//   - Does NOT call createQcReview (DR 0090 §2.4 — human-only path)
//   - Does NOT transition production.assets.status by any path
//   - QC_GATE is architecturally mandatory; cannot be bypassed (DR 0090 §2.2)
//   - Machine recommendations only — no binding verdict authority
//   - Zero financial authority; no financial table access
//   - Initiator roles: OWNER, ADMIN_OPERATIONS, QC

import { delegateSubTask } from '@/lib/orchestration/delegation';
import type { InitiatorRole, TaskContext } from '@/lib/orchestration/types';

export interface QcReviewDelegationParams {
  parentTaskId: string;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: Extract<InitiatorRole, 'OWNER' | 'ADMIN_OPERATIONS' | 'QC'>;
  assetId: string;
  assetName: string;
  assetType: string;
  context?: TaskContext;
}

export type QcReviewDelegationResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

export async function delegateQcReview(
  params: QcReviewDelegationParams,
): Promise<QcReviewDelegationResult> {
  const {
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    assetId,
    assetName,
    assetType,
    context,
  } = params;

  const allowedRoles: ReadonlyArray<string> = ['OWNER', 'ADMIN_OPERATIONS', 'QC'];
  if (!allowedRoles.includes(initiatorRole)) {
    return { ok: false, error: 'QC review may only be initiated by OWNER, ADMIN_OPERATIONS, or QC' };
  }
  if (!assetId || typeof assetId !== 'string') {
    return { ok: false, error: 'assetId must be a non-empty string' };
  }
  if (!assetName || typeof assetName !== 'string') {
    return { ok: false, error: 'assetName must be a non-empty string' };
  }
  if (!assetType || typeof assetType !== 'string') {
    return { ok: false, error: 'assetType must be a non-empty string' };
  }

  // DR 0114 §2.2: fixed five-step plan
  // Steps 0–2: QC skill sub-tasks (machine recommendations — advisory only, no status change)
  //   Step 0: qc.asset.metadata  — on AGENT_ALLOWLIST per DR 0075
  //   Step 1: qc.script.review   — on AGENT_ALLOWLIST per DR 0115
  //   Step 2: qc.brand.alignment — on AGENT_ALLOWLIST per DR 0115
  // Step 3: QC_GATE — mandatory human verdict via createQcReview (DR 0090 §2.2)
  //   Gate resolves only when OWNER/ADMIN_OPERATIONS/QC submits via createQcReview.
  //   Agent cannot approve its own gate.
  // Step 4: NOTIFICATION — QC_PASS_NOTIFY or QC_FAIL_NOTIFY audit event
  const plan = {
    steps: [
      {
        step_index: 0,
        step_type: 'SKILL' as const,
        skill_id: 'qc.asset.metadata',
        input: { assetId, assetName, assetType },
      },
      {
        step_index: 1,
        step_type: 'SKILL' as const,
        skill_id: 'qc.script.review',
        input: { assetId, assetName, assetType },
      },
      {
        step_index: 2,
        step_type: 'SKILL' as const,
        skill_id: 'qc.brand.alignment',
        input: { assetId, assetName, assetType },
      },
      {
        step_index: 3,
        step_type: 'QC_GATE' as const,
        // DR 0090 §2.2: gate resolved only by authorized human via createQcReview
        input: { assetId, requiredRoles: ['OWNER', 'ADMIN_OPERATIONS', 'QC'] },
      },
      {
        step_index: 4,
        step_type: 'NOTIFICATION' as const,
        input: { assetId },
      },
    ],
    generated_at: new Date().toISOString(),
  };

  const result = await delegateSubTask({
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    intentType: 'COORDINATE_QC_REVIEW',
    title: `QC review: ${assetName}`,
    context: context ?? {},
    plan,
  });

  return result;
}
