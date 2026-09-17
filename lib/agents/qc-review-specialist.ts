// QC Review Specialist Agent — DR 0114, updated DR 0123
// Coordinates QC skill sub-tasks (machine recommendations) and enforces mandatory
// human QC_GATE before any asset status transition.
//
// CONSTRAINTS (DR 0114, DR 0090, DR 0123):
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
  /** DR 0123: approved brief ID — included in QC gate step input for audit trail */
  briefId: string;
  /** DR 0123: approved brief text — passed to qc.creative.quality for fidelity assessment */
  briefText: string;
  /** Optional deliverables spec from the brief */
  deliverables?: string;
  /** Optional target audience from the brief */
  targetAudience?: string;
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
    briefId,
    briefText,
    deliverables,
    targetAudience,
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
  if (!briefId || typeof briefId !== 'string') {
    return { ok: false, error: 'briefId must be a non-empty string' };
  }
  if (!briefText || typeof briefText !== 'string') {
    return { ok: false, error: 'briefText must be a non-empty string' };
  }

  // DR 0114 §2.2 / DR 0123 §2.5: fixed six-step plan
  // Steps 0–3: QC skill sub-tasks (machine recommendations — advisory only, no status change)
  //   Step 0: qc.asset.metadata    — on AGENT_ALLOWLIST per DR 0075
  //   Step 1: qc.script.review     — on AGENT_ALLOWLIST per DR 0115
  //   Step 2: qc.brand.alignment   — on AGENT_ALLOWLIST per DR 0115
  //   Step 3: qc.creative.quality  — brief fidelity check, on AGENT_ALLOWLIST per DR 0123
  // Step 4: QC_GATE — mandatory human verdict (DR 0090 §2.2); rejection requires decisionReason (DR 0123 §2.4)
  //   Gate resolves only when OWNER/ADMIN_OPERATIONS/QC submits with documented findings.
  //   Agent cannot approve its own gate.
  // Step 5: NOTIFICATION — QC_PASS_NOTIFY or QC_FAIL_NOTIFY audit event
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
        step_type: 'SKILL' as const,
        skill_id: 'qc.creative.quality',
        // DR 0123 §2.1: brief fidelity assessment across eight quality categories
        input: { assetId, assetName, assetType, briefText, deliverables, targetAudience },
      },
      {
        step_index: 4,
        step_type: 'QC_GATE' as const,
        // DR 0090 §2.2, DR 0123 §2.3: gate requires READY_FOR_QC asset status
        // DR 0123 §2.4: rejection requires non-empty decisionReason
        input: { assetId, briefId, requiredRoles: ['OWNER', 'ADMIN_OPERATIONS', 'QC'] },
      },
      {
        step_index: 5,
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
