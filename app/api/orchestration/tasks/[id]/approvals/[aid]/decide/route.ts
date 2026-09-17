// POST /api/orchestration/tasks/:id/approvals/:aid/decide — resolve a human gate.
// Auth: admin session (role must meet or exceed the gate's required_role).

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { taskSteps } from '@/db/schema/orchestration';
import { eq, and } from 'drizzle-orm';
import { getAdminSessionFromRequest } from '@/lib/admin/session';
import { resolveGate } from '@/lib/orchestration/gates';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string; aid: string }> };

export async function POST(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = getAdminSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId, aid: gateId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const decision = b?.decision;
  if (decision !== 'APPROVED' && decision !== 'REJECTED') {
    return NextResponse.json(
      { error: 'decision must be APPROVED or REJECTED' },
      { status: 422 },
    );
  }

  const decisionReason = typeof b?.reason === 'string' ? b.reason.trim() : undefined;

  // Look up the task step that owns this gate so we can pass its id to resolveGate.
  const steps = await db
    .select({ id: taskSteps.id })
    .from(taskSteps)
    .where(
      and(
        eq(taskSteps.gate_id, gateId),
        eq(taskSteps.organization_id, session.organizationId),
      ),
    )
    .limit(1);

  const stepId = steps.length > 0 ? steps[0].id : '';

  const result = await resolveGate({
    gateId,
    taskId,
    organizationId: session.organizationId,
    stepId,
    resolverId: session.userId,
    resolverRole: session.role,
    decision,
    decisionReason,
  });

  if (!result.ok) {
    const statusCode =
      result.reason === 'Gate not found' || result.reason === 'Task not found' ? 404
      : result.reason.includes('Self-approval') || result.reason.includes('required approver role') ? 403
      : result.reason.includes('already') ? 409
      : 400;
    return NextResponse.json({ error: result.reason }, { status: statusCode });
  }

  return NextResponse.json({ gateId, decision: result.decision });
}
