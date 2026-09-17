// POST /api/orchestration/tasks — create a new agent task and generate a rule-based plan.
// Auth: admin session (any admin role). CLIENT and AGENT excluded per Architecture v2 §9.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { agentTasks } from '@/db/schema/orchestration';
import { uuidv7 } from 'uuidv7';
import { getAdminSessionFromRequest } from '@/lib/admin/session';
import { classifyIntent } from '@/lib/orchestration/intent';
import { buildPlan } from '@/lib/orchestration/planner';
import { auditTaskCreated, auditPlanGenerated } from '@/lib/orchestration/audit';
import type { InitiatorRole, TaskContext, IntentType } from '@/lib/orchestration/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const intentRaw = typeof b?.intent_type === 'string' ? b.intent_type : '';
  const title = typeof b?.title === 'string' ? b.title.trim() : null;
  const context = (b?.context ?? {}) as TaskContext;

  const intentType = classifyIntent(intentRaw) as IntentType | null;
  if (!intentType) {
    return NextResponse.json(
      { error: `Unknown intent_type: ${intentRaw}` },
      { status: 422 },
    );
  }

  const planResult = buildPlan({ intent_type: intentType, context });
  if (!planResult.ok) {
    return NextResponse.json({ error: planResult.reason }, { status: 422 });
  }

  const taskId = uuidv7();
  const now = new Date();

  await db.insert(agentTasks).values({
    id: taskId,
    organization_id: session.organizationId,
    initiated_by_user_id: session.userId,
    initiator_role: session.role as InitiatorRole,
    intent_type: intentType,
    title: title ?? null,
    context,
    plan: planResult.plan as unknown as Record<string, unknown>,
    status: 'PLAN_READY',
    created_at: now,
    updated_at: now,
  });

  await auditTaskCreated({
    organizationId: session.organizationId,
    taskId,
    intentType,
    initiatorId: session.userId,
    initiatorRole: session.role as InitiatorRole,
  });

  await auditPlanGenerated({
    organizationId: session.organizationId,
    taskId,
    stepCount: planResult.plan.steps.length,
    stepTypes: planResult.plan.steps.map((s) => s.step_type),
  });

  return NextResponse.json({ taskId, status: 'PLAN_READY', plan: planResult.plan }, { status: 201 });
}
