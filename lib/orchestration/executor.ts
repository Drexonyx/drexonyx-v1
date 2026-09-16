// SKILL step executor for the orchestration runner (Architecture v2 §9, §10).
// Enforces the two-gate authorization model before any skill execution:
//   Gate 1 — AGENT allowlist (isAgentAuthorized): only approved skills may run.
//   Gate 2 — Initiator role (isHumanAuthorized): initiator must be authorized for this skill.
// Neither gate may be bypassed or softened. Boundary violations are always audited.

import { isAgentAuthorized, isHumanAuthorized, SKILL_REGISTRY } from '@/lib/skills';
import type { SkillId } from '@/lib/skills';
import { auditBoundaryViolation } from './audit';
import type { InitiatorRole } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ExecutorResult =
  | { ok: true; output: Record<string, unknown> }
  | { ok: false; error: string; isTransient: boolean };

// ── executeSkillStep ──────────────────────────────────────────────────────────

export async function executeSkillStep(params: {
  taskId: string;
  organizationId: string;
  stepIndex: number;
  skillId: string;
  input: Record<string, unknown>;
  initiatorUserId: string;
  initiatorRole: InitiatorRole;
}): Promise<ExecutorResult> {
  const skillId = params.skillId as SkillId;

  // ── Gate 1: AGENT allowlist ───────────────────────────────────────────────
  if (!isAgentAuthorized(skillId)) {
    await auditBoundaryViolation({
      organizationId: params.organizationId,
      taskId: params.taskId,
      attemptedAction: `SKILL_EXECUTE:${params.skillId}`,
      blockReason: `Skill ${params.skillId} is not on the AGENT allowlist`,
    });
    return {
      ok: false,
      error: `Skill ${params.skillId} is not authorized for agent execution`,
      isTransient: false,
    };
  }

  // ── Gate 2: Initiator role authorization ──────────────────────────────────
  if (!isHumanAuthorized(skillId, params.initiatorRole)) {
    await auditBoundaryViolation({
      organizationId: params.organizationId,
      taskId: params.taskId,
      attemptedAction: `SKILL_EXECUTE:${params.skillId}`,
      blockReason: `Initiator role ${params.initiatorRole} is not authorized for skill ${params.skillId}`,
    });
    return {
      ok: false,
      error: `Initiator role ${params.initiatorRole} is not authorized for skill ${params.skillId}`,
      isTransient: false,
    };
  }

  // ── Execute ────────────────────────────────────────────────────────────────
  const skill = SKILL_REGISTRY[skillId];
  if (!skill) {
    return {
      ok: false,
      error: `Skill ${params.skillId} not found in registry`,
      isTransient: false,
    };
  }

  const context = {
    organizationId: params.organizationId,
    actorId: params.initiatorUserId,
    actorType: 'USER' as const,
    actorRole: params.initiatorRole,
  };

  const result = await skill.execute(params.input, context);

  if (!result.ok) {
    return { ok: false, error: result.error, isTransient: result.isTransient };
  }

  return { ok: true, output: result.output as Record<string, unknown> };
}
