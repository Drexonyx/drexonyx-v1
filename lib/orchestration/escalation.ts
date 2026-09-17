// Escalation router (Architecture v2 §14, §18, §20 P2).
// Creates an ESCALATION gate in task_approvals, transitions task to ESCALATED,
// writes TASK_ESCALATED audit event, and sends alert email to OWNER via Resend.

import { db } from '@/db/index';
import { agentTasks, taskApprovals } from '@/db/schema/orchestration';
import { eq, and } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { auditTaskEscalated } from './audit';
import { sendEscalationEmail } from './email';
import type { ApproverRole } from './types';

export type EscalationResult =
  | { ok: true; approvalId: string }
  | { ok: false; reason: string };

export async function escalateTask(params: {
  taskId: string;
  organizationId: string;
  reason: string;
  escalatedToRole?: ApproverRole;
}): Promise<EscalationResult> {
  const { taskId, organizationId, reason } = params;
  const escalatedToRole: ApproverRole = params.escalatedToRole ?? 'OWNER';

  const now = new Date();
  const approvalId = uuidv7();

  await db.insert(taskApprovals).values({
    id: approvalId,
    agent_task_id: taskId,
    organization_id: organizationId,
    approver_role: escalatedToRole,
    status: 'PENDING',
    created_at: now,
    updated_at: now,
  });

  await db
    .update(agentTasks)
    .set({ status: 'ESCALATED', updated_at: now })
    .where(and(eq(agentTasks.id, taskId), eq(agentTasks.organization_id, organizationId)));

  await auditTaskEscalated({
    organizationId,
    taskId,
    escalationReason: reason,
    escalatedToRole,
  });

  // Best-effort: email failures do not affect escalation outcome
  void sendEscalationEmail({ taskId, organizationId, reason });

  return { ok: true, approvalId };
}
