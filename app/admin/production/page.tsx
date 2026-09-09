import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAdminProductionJobs, getAdminOrders, getAdminAssetsForWorkflow } from '@/lib/admin/queries';
import { isAdminRole } from '@/lib/admin/types';
import s from '../admin.module.css';
import { ProductionJobActions } from './ProductionJobActions';
import { ManualUploadWorkflow } from './ManualUploadWorkflow';
import { RevisionInitiation } from './RevisionInitiation';

export const metadata = { title: 'Production Jobs — Admin' };

function jobStatusBadgeClass(status: string) {
  if (status === 'QUEUED') return `${s.badge} ${s.badgeWarning}`;
  if (status === 'RUNNING') return `${s.badge} ${s.badgeAccent}`;
  if (status === 'COMPLETED') return `${s.badge} ${s.badgeSuccess}`;
  if (status === 'FAILED') return `${s.badge} ${s.badgeDanger}`;
  if (status === 'CANCELLED') return `${s.badge} ${s.badgeNeutral}`;
  return `${s.badge} ${s.badgeNeutral}`;
}

export default async function AdminProductionPage() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');

  const { organizationId, role } = session.user;
  const canCreate = role === 'OWNER' || role === 'ADMIN_OPERATIONS' || role === 'CREATIVE_PRODUCTION';
  const canCancel = role === 'OWNER' || role === 'ADMIN_OPERATIONS';

  const [jobs, orders, workflowAssets] = await Promise.all([
    getAdminProductionJobs(organizationId),
    getAdminOrders(organizationId),
    getAdminAssetsForWorkflow(organizationId),
  ]);

  const manualQueuedJobs = jobs.filter((j) => j.job_type === 'MANUAL_UPLOAD' && j.status === 'QUEUED');
  const uploadedAssets = workflowAssets.filter((a) => a.status === 'UPLOADED');
  const revisionAssets = workflowAssets.filter((a) => a.status === 'REVISION_REQUIRED');

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Production Jobs</h1>
        <p className={s.pageSubtitle}>AI_GENERATION and MANUAL_UPLOAD jobs — QUEUED → RUNNING → COMPLETED</p>
      </div>

      {canCreate && (
        <div className={s.actionBar}>
          <ProductionJobActions
            orders={orders.map((o) => ({ id: o.id, status: o.status }))}
            canCancel={false}
          />
        </div>
      )}

      {canCreate && (
        <ManualUploadWorkflow
          jobs={manualQueuedJobs.map((j) => ({ id: j.id, order_id: j.order_id, status: j.status }))}
          uploadedAssets={uploadedAssets.map((a) => ({ id: a.id, order_id: a.order_id, name: a.name, status: a.status }))}
        />
      )}

      {canCreate && (
        <RevisionInitiation
          revisionAssets={revisionAssets.map((a) => ({ id: a.id, order_id: a.order_id, name: a.name, status: a.status }))}
        />
      )}

      {jobs.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No production jobs</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Order</th>
                <th>Type</th>
                <th>Status</th>
                <th>Description</th>
                <th>Created</th>
                {canCancel && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className={`${s.cellMono} ${s.cellPrimary}`}>{j.id.slice(0, 8)}…</td>
                  <td className={s.cellMono}>{j.order_id ? j.order_id.slice(0, 8) + '…' : '—'}</td>
                  <td>
                    <span className={`${s.badge} ${s.badgeNeutral}`}>{j.job_type}</span>
                  </td>
                  <td>
                    <span className={jobStatusBadgeClass(j.status)}>{j.status}</span>
                  </td>
                  <td>{j.description ?? <span style={{ color: 'var(--drex-text-muted)', fontStyle: 'italic' }}>—</span>}</td>
                  <td className={s.cellMono}>
                    {j.created_at ? new Date(j.created_at).toLocaleDateString() : '—'}
                  </td>
                  {canCancel && (
                    <td>
                      <ProductionJobActions
                        jobId={j.id}
                        jobStatus={j.status}
                        orders={[]}
                        canCancel={true}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
