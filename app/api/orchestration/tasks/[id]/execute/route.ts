// POST /api/orchestration/tasks/:id/execute — run the next step of an approved plan.
// Auth: admin session (OWNER or ADMIN_OPERATIONS only per Architecture v2 §16).

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { agentTasks } from '@/db/schema/orchestration';
import { eq, and } from 'drizzle-orm';
import { getAdminSessionFromRequest } from '@/lib/admin/session';
import { advanceTask } from '@/lib/orchestration/runner';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
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
  if (!['PLAN_READY', 'EXECUTING'].includes(task.status)) {
    return NextResponse.json(
      { error: `Task status ${task.status} is not eligible for execution` },
      { status: 409 },
    );
  }

  const result = await advanceTask({ taskId, organizationId: session.organizationId });

  if (!result.ok) {
    const statusCode =
      result.outcome === 'INVALID_STATE' ? 409
      : result.outcome === 'BOUNDARY_VIOLATED' ? 403
      : 500;
    return NextResponse.json({ error: result.reason, outcome: result.outcome }, { status: statusCode });
  }

  return NextResponse.json({ taskId, outcome: result.outcome });
}
