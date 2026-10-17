// Vercel Cron Job: advances all PLAN_READY DISCOVER_SALES_LEAD agent tasks one batch at a time.
// Deduplication is enforced inside the task plan's VERIFY step (SALES_DEDUP check_type).
// Authentication: Vercel sets Authorization: Bearer {CRON_SECRET} on every cron invocation.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { agentTasks } from '@/db/schema/orchestration';
import { and, eq } from 'drizzle-orm';
import { autoAdvanceTask } from '@/lib/orchestration/runner';

const DISCOVERY_BATCH_LIMIT = 20;

export const maxDuration = 60; // seconds

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organizationId = process.env.DREXONYX_ORG_ID?.trim();
  if (!organizationId) {
    return NextResponse.json({ error: 'DREXONYX_ORG_ID not configured' }, { status: 500 });
  }

  const pendingTasks = await db
    .select({ id: agentTasks.id, organization_id: agentTasks.organization_id })
    .from(agentTasks)
    .where(
      and(
        eq(agentTasks.status, 'PLAN_READY'),
        eq(agentTasks.intent_type, 'DISCOVER_SALES_LEAD'),
        eq(agentTasks.organization_id, organizationId),
      ),
    )
    .limit(DISCOVERY_BATCH_LIMIT);

  if (pendingTasks.length === 0) {
    return NextResponse.json({ dispatched: 0, completed: 0, awaiting_gate: 0, retry_pending: 0, errors: 0 });
  }

  const outcomes = await Promise.allSettled(
    pendingTasks.map((task) =>
      autoAdvanceTask({ taskId: task.id, organizationId: task.organization_id }),
    ),
  );

  let completed = 0;
  let awaiting_gate = 0;
  let retry_pending = 0;
  let errors = 0;

  for (const outcome of outcomes) {
    if (outcome.status === 'rejected') {
      errors++;
      console.error('[cron/sales-discovery] autoAdvanceTask threw:', outcome.reason);
    } else if (!outcome.value.ok) {
      errors++;
      console.error('[cron/sales-discovery] autoAdvanceTask error:', outcome.value.reason);
    } else if (outcome.value.outcome === 'TASK_COMPLETED') {
      completed++;
    } else if (outcome.value.outcome === 'AWAITING_GATE') {
      awaiting_gate++;
    } else {
      retry_pending++;
    }
  }

  return NextResponse.json({
    dispatched: pendingTasks.length,
    completed,
    awaiting_gate,
    retry_pending,
    errors,
  });
}
