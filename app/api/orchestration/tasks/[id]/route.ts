// GET /api/orchestration/tasks/:id  — full task record: steps, gates, audit trail.
// DELETE /api/orchestration/tasks/:id — cancel task (OWNER or ADMIN_OPERATIONS only).
// Auth: admin session.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { agentTasks, taskSteps, taskApprovals } from '@/db/schema/orchestration';
import { auditEvents } from '@/db/schema/system';
import { eq, and, asc } from 'drizzle-orm';
import { getAdminSessionFromRequest } from '@/lib/admin/session';
import { auditTaskCancelled } from '@/lib/orchestration/audit';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = getAdminSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId } = await params;

  const tasks = await db
    .select()
    .from(agentTasks)
    .where(and(eq(agentTasks.id, taskId), eq(agentTasks.organization_id, session.organizationId)))
    .limit(1);

  if (tasks.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [steps, gates, events] = await Promise.all([
    db
      .select()
      .from(taskSteps)
      .where(and(eq(taskSteps.agent_task_id, taskId), eq(taskSteps.organization_id, session.organizationId)))
      .orderBy(asc(taskSteps.step_index)),
    db
      .select()
      .from(taskApprovals)
      .where(and(eq(taskApprovals.agent_task_id, taskId), eq(taskApprovals.organization_id, session.organizationId))),
    db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.entity_id, taskId), eq(auditEvents.organization_id, session.organizationId)))
      .orderBy(asc(auditEvents.created_at)),
  ]);

  return NextResponse.json({ task: tasks[0], steps, gates, auditTrail: events });
}

export async function DELETE(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = getAdminSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role !== 'OWNER' && session.role !== 'ADMIN_OPERATIONS') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: taskId } = await params;

  const tasks = await db
    .select()
    .from(agentTasks)
    .where(and(eq(agentTasks.id, taskId), eq(agentTasks.organization_id, session.organizationId)))
    .limit(1);

  if (tasks.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const task = tasks[0];
  if (task.status === 'COMPLETED' || task.status === 'CANCELLED') {
    return NextResponse.json(
      { error: `Cannot cancel a task in status: ${task.status}` },
      { status: 409 },
    );
  }

  const now = new Date();
  await db
    .update(agentTasks)
    .set({ status: 'CANCELLED', updated_at: now })
    .where(and(eq(agentTasks.id, taskId), eq(agentTasks.organization_id, session.organizationId)));

  let reason = 'Cancelled by admin';
  try {
    const body = await request.json();
    if (typeof body?.reason === 'string') reason = body.reason.trim() || reason;
  } catch { /* no body */ }

  await auditTaskCancelled({
    organizationId: session.organizationId,
    taskId,
    cancelledById: session.userId,
    reason,
  });

  return NextResponse.json({ taskId, status: 'CANCELLED' });
}
