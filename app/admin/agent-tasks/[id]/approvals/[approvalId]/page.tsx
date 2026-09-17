import { getAdminSession } from '@/lib/admin/session';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/db/index';
import { agentTasks, taskApprovals } from '@/db/schema/orchestration';
import { eq, and } from 'drizzle-orm';
import s from '../../../../admin.module.css';

export const metadata = { title: 'Gate Resolution — Admin' };

type PageProps = { params: Promise<{ id: string; approvalId: string }> };

export default async function GateResolutionPage({ params }: PageProps) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  if (session.role !== 'OWNER' && session.role !== 'ADMIN_OPERATIONS') {
    redirect('/admin/agent-tasks');
  }

  const { id: taskId, approvalId } = await params;

  const tasks = await db
    .select()
    .from(agentTasks)
    .where(and(eq(agentTasks.id, taskId), eq(agentTasks.organization_id, session.organizationId)))
    .limit(1);

  if (tasks.length === 0) notFound();
  const task = tasks[0];

  const gates = await db
    .select()
    .from(taskApprovals)
    .where(
      and(
        eq(taskApprovals.id, approvalId),
        eq(taskApprovals.agent_task_id, taskId),
        eq(taskApprovals.organization_id, session.organizationId),
      ),
    )
    .limit(1);

  if (gates.length === 0) notFound();
  const gate = gates[0];

  const isResolvable =
    gate.status === 'PENDING' &&
    (session.role === 'OWNER' || session.role === gate.approver_role);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Gate Resolution</h1>
        <p className={s.pageSubtitle}>
          Task: {task.title ?? task.intent_type} &middot; Required: {gate.approver_role}
        </p>
      </div>

      <div style={{ maxWidth: '36rem' }}>
        <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '0.5rem 1.5rem', marginBottom: '2rem' }}>
          <dt style={{ fontWeight: 600, color: 'var(--drex-text-secondary)' }}>Gate ID</dt>
          <dd className={s.cellMono}>{gate.id}</dd>
          <dt style={{ fontWeight: 600, color: 'var(--drex-text-secondary)' }}>Status</dt>
          <dd>
            <span className={`${s.badge} ${gate.status === 'PENDING' ? s.badgeWarning : gate.status === 'APPROVED' ? s.badgeSuccess : s.badgeDanger}`}>
              {gate.status}
            </span>
          </dd>
          <dt style={{ fontWeight: 600, color: 'var(--drex-text-secondary)' }}>Required Role</dt>
          <dd>{gate.approver_role}</dd>
        </dl>

        {!isResolvable ? (
          <div className={s.emptyState}>
            <div className={s.emptyTitle}>
              {gate.status !== 'PENDING'
                ? `Gate already ${gate.status}`
                : 'Your role is insufficient to resolve this gate'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <form action={`/api/orchestration/tasks/${taskId}/approvals/${approvalId}/decide`} method="POST">
              <input type="hidden" name="decision" value="APPROVED" />
              <button type="submit" className={`${s.badge} ${s.badgeSuccess}`} style={{ cursor: 'pointer', padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: 700 }}>
                Approve
              </button>
            </form>
            <form action={`/api/orchestration/tasks/${taskId}/approvals/${approvalId}/decide`} method="POST">
              <input type="hidden" name="decision" value="REJECTED" />
              <button type="submit" className={`${s.badge} ${s.badgeDanger}`} style={{ cursor: 'pointer', padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: 700 }}>
                Reject
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
