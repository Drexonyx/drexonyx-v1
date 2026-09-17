// Asset Metadata QC Specialist Agent — DR 0108
// Authorized skill: qc.asset.metadata (already on AGENT_ALLOWLIST per DR 0075 §2.2).
// No AGENT_ALLOWLIST expansion. Zero financial authority. No independent escalation.

import { delegateSubTask } from '@/lib/orchestration/delegation';
import type { InitiatorRole, TaskContext } from '@/lib/orchestration/types';

export interface QcMetadataDelegationParams {
  parentTaskId: string;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: InitiatorRole;
  assetName: string;
  assetType: string;
  metadata?: Record<string, string>;
  context?: TaskContext;
}

export type QcMetadataDelegationResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

export async function delegateQcMetadata(
  params: QcMetadataDelegationParams,
): Promise<QcMetadataDelegationResult> {
  const { parentTaskId, organizationId, initiatedByUserId, initiatorRole, assetName, assetType, metadata, context } = params;

  if (!assetName || typeof assetName !== 'string') {
    return { ok: false, error: 'assetName must be a non-empty string' };
  }
  if (!assetType || typeof assetType !== 'string') {
    return { ok: false, error: 'assetType must be a non-empty string' };
  }

  const stepInput: Record<string, unknown> = { assetName, assetType };
  if (metadata !== undefined) {
    stepInput.metadata = metadata;
  }

  const plan = {
    steps: [
      {
        step_index: 0,
        step_type: 'SKILL' as const,
        skill_id: 'qc.asset.metadata',
        input: stepInput,
      },
    ],
    generated_at: new Date().toISOString(),
  };

  const result = await delegateSubTask({
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    intentType: 'INSPECT_ASSET_METADATA',
    title: `QC metadata: ${assetName}`,
    context: context ?? {},
    plan,
  });

  return result;
}
