// Prompt Optimization Specialist Agent — DR 0109
// Authorized skill: utility.prompt.optimize (already on AGENT_ALLOWLIST per DR 0075 §2.2).
// No AGENT_ALLOWLIST expansion. Zero financial authority. No independent escalation.
// Output is advisory data returned to the parent task — does not authorize AI generation.

import { delegateSubTask } from '@/lib/orchestration/delegation';
import type { InitiatorRole, TaskContext } from '@/lib/orchestration/types';

export interface PromptOptimizeDelegationParams {
  parentTaskId: string;
  organizationId: string;
  initiatedByUserId: string;
  initiatorRole: InitiatorRole;
  originalPrompt: string;
  objectives?: string;
  targetModel?: string;
  context?: TaskContext;
}

export type PromptOptimizeDelegationResult =
  | { ok: true; subTaskId: string }
  | { ok: false; error: string };

export async function delegatePromptOptimize(
  params: PromptOptimizeDelegationParams,
): Promise<PromptOptimizeDelegationResult> {
  const {
    parentTaskId,
    organizationId,
    initiatedByUserId,
    initiatorRole,
    originalPrompt,
    objectives,
    targetModel,
    context,
  } = params;

  if (!originalPrompt || typeof originalPrompt !== 'string') {
    return { ok: false, error: 'originalPrompt must be a non-empty string' };
  }

  const stepInput: Record<string, unknown> = { originalPrompt };
  if (objectives !== undefined) stepInput.objectives = objectives;
  if (targetModel !== undefined) stepInput.targetModel = targetModel;

  const plan = {
    steps: [
      {
        step_index: 0,
        step_type: 'SKILL' as const,
        skill_id: 'utility.prompt.optimize',
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
    intentType: 'OPTIMIZE_BRIEF_PROMPTS',
    title: `Optimize prompt: ${originalPrompt.slice(0, 60)}${originalPrompt.length > 60 ? '…' : ''}`,
    context: context ?? {},
    plan,
  });

  return result;
}
