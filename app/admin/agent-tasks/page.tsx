import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { db } from '@/db/index';
import { agentTasks, taskSteps } from '@/db/schema/orchestration';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import s from '../admin.module.css';

export const metadata = { title: 'Agent Tasks — Admin' };

const STATUS_BADGE: Record<string, string> = {
  PENDING: s.badgeNeutral,
  PLAN_READY: s.badgeAccent,
  EXECUTING: s.badgeAccent,
  AWAITING_GATE: s.badgeWarning,
  COMPLETED: s.badgeSuccess,
  FAILED: s.badgeDanger,
  ESCALATED: s.badgeDanger,
  CANCELLED: s.badgeNeutral,
};

export default async function AgentTasksPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const tasks = await db
    .select()
    .from(agentTasks)
    .where(eq(agentTasks.organization_id, session.organizationId))
    .orderBy(desc(agentTasks.created_at))
    .limit(100);

  // Load step counts for progress display
  const stepCounts: Record<string, { total: number; done: number }> = {};
  if (tasks.length > 0) {
    const allSteps = await db
      .select({ agent_task_id: taskSteps.agent_task_id, status: taskSteps.status })
      .from(taskSteps)
      .where(eq(taskSteps.organization_id, session.organizationId));
    const DONE = new Set(['SUCCEEDED', 'GATE_APPROVED', 'SKIPPED']);
    for (const step of allSteps) {
      const tid = step.agent_task_id;
      if (!stepCounts[tid]) stepCounts[tid] = { total: 0, done: 0 };
      stepCounts[tid].total++;
      if (DONE.has(step.status)) stepCounts[tid].done++;
    }
  }

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Agent Tasks</h1>
        <p className={s.pageSubtitle}>Orchestrated task execution log</p>
      </div>

      {tasks.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No agent tasks</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Title / Intent</th>
                <th>Status</th>
                <th>Initiator</th>
                <th>Progress</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const counts = stepCounts[t.id] ?? { total: 0, done: 0 };
                const badgeCls = STATUS_BADGE[t.status] ?? s.badgeNeutral;
                return (
                  <tr key={t.id}>
                    <td className={s.cellPrimary}>
                      <Link href={`/admin/agent-tasks/${t.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {t.title ?? t.intent_type}
                      </Link>
                    </td>
                    <td>
                      <span className={`${s.badge} ${badgeCls}`}>{t.status}</span>
                    </td>
                    <td className={s.cellMono}>{t.initiator_role}</td>
                    <td className={s.cellMono}>
                      {counts.total > 0 ? `${counts.done}/${counts.total}` : '—'}
                    </td>
                    <td className={s.cellMono}>
                      {t.created_at ? new Date(t.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
