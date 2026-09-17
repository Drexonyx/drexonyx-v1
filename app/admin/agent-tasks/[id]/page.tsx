import { getAdminSession } from '@/lib/admin/session';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/db/index';
import { agentTasks, taskSteps, taskApprovals } from '@/db/schema/orchestration';
import { auditEvents } from '@/db/schema/system';
import { eq, and, asc } from 'drizzle-orm';
import Link from 'next/link';
import s from '../../admin.module.css';
import type { TaskPlan } from '@/lib/orchestration/types';

export const metadata = { title: 'Task Detail — Admin' };

const STEP_BADGE: Record<string, string> = {
  PENDING: s.badgeNeutral,
  DISPATCHED: s.badgeAccent,
  RUNNING: s.badgeAccent,
  SUCCEEDED: s.badgeSuccess,
  FAILED: s.badgeDanger,
  RETRY_PENDING: s.badgeWarning,
  GATE_PENDING: s.badgeWarning,
  GATE_APPROVED: s.badgeSuccess,
  GATE_REJECTED: s.badgeDanger,
  SKIPPED: s.badgeNeutral,
};

const TASK_BADGE: Record<string, string> = {
  PENDING: s.badgeNeutral,
  PLAN_READY: s.badgeAccent,
  EXECUTING: s.badgeAccent,
  AWAITING_GATE: s.badgeWarning,
  COMPLETED: s.badgeSuccess,
  FAILED: s.badgeDanger,
  ESCALATED: s.badgeDanger,
  CANCELLED: s.badgeNeutral,
};

type PageProps = { params: Promise<{ id: string }> };

export default async function AgentTaskDetailPage({ params }: PageProps) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { id: taskId } = await params;

  const tasks = await db
    .select()
    .from(agentTasks)
    .where(and(eq(agentTasks.id, taskId), eq(agentTasks.organization_id, session.organizationId)))
    .limit(1);

  if (tasks.length === 0) notFound();
  const task = tasks[0];

  const [steps, gates, events] = await Promise.all([
    db.select().from(taskSteps)
      .where(and(eq(taskSteps.agent_task_id, taskId), eq(taskSteps.organization_id, session.organizationId)))
      .orderBy(asc(taskSteps.step_index)),
    db.select().from(taskApprovals)
      .where(and(eq(taskApprovals.agent_task_id, taskId), eq(taskApprovals.organization_id, session.organizationId))),
    db.select().from(auditEvents)
      .where(and(eq(auditEvents.entity_id, taskId), eq(auditEvents.organization_id, session.organizationId)))
      .orderBy(asc(auditEvents.created_at)),
  ]);

  const taskBadge = TASK_BADGE[task.status] ?? s.badgeNeutral;
  const plan = task.plan as unknown as TaskPlan | null;
  const canExecute = session.role === 'OWNER' || session.role === 'ADMIN_OPERATIONS';

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>{task.title ?? task.intent_type}</h1>
        <p className={s.pageSubtitle}>
          <span className={`${s.badge} ${taskBadge}`}>{task.status}</span>
          {' '}&nbsp;{task.intent_type} &middot; initiated by {task.initiator_role}
        </p>
      </div>

      {canExecute && ['PLAN_READY', 'EXECUTING'].includes(task.status) && (
        <form action={`/api/orchestration/tasks/${taskId}/execute`} method="POST" style={{ marginBottom: '1.5rem' }}>
          <button type="submit" className={s.badge} style={{ cursor: 'pointer', padding: '0.5rem 1rem' }}>
            Advance Next Step
          </button>
        </form>
      )}

      {plan && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Plan
          </h2>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr><th>#</th><th>Type</th><th>Skill</th><th>Status</th></tr>
              </thead>
              <tbody>
                {plan.steps.map((ps, idx) => {
                  const step = steps.find((st) => st.step_index === idx);
                  const stepBadge = step ? (STEP_BADGE[step.status] ?? s.badgeNeutral) : s.badgeNeutral;
                  return (
                    <tr key={idx}>
                      <td className={s.cellMono}>{idx}</td>
                      <td>{ps.step_type}</td>
                      <td className={s.cellMono}>{ps.skill_id ?? '—'}</td>
                      <td>
                        {step ? <span className={`${s.badge} ${stepBadge}`}>{step.status}</span> : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {gates.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Open Gates
          </h2>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr><th>Gate ID</th><th>Required Role</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {gates.map((g) => (
                  <tr key={g.id}>
                    <td className={s.cellMono}>{g.id.slice(0, 8)}…</td>
                    <td>{g.approver_role}</td>
                    <td><span className={`${s.badge} ${g.status === 'PENDING' ? s.badgeWarning : g.status === 'APPROVED' ? s.badgeSuccess : s.badgeDanger}`}>{g.status}</span></td>
                    <td>
                      {g.status === 'PENDING' && canExecute ? (
                        <Link href={`/admin/agent-tasks/${taskId}/approvals/${g.id}`}>
                          Resolve
                        </Link>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Audit Trail
        </h2>
        {events.length === 0 ? (
          <div className={s.emptyState}><div className={s.emptyTitle}>No audit events</div></div>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th>Time</th><th>Action</th></tr></thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className={s.cellMono}>{e.created_at ? new Date(e.created_at).toLocaleString() : '—'}</td>
                    <td className={s.cellMono}>{e.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
