import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { getAdminApprovals, getAdminAssets, getAdminOrders } from '@/lib/admin/queries';
import s from '../admin.module.css';
import { ApprovalActions } from './ApprovalActions';

export const metadata = { title: 'Approvals — Admin' };

function approvalBadgeClass(status: string) {
  if (status === 'PENDING') return `${s.badge} ${s.badgeWarning}`;
  if (status === 'APPROVED') return `${s.badge} ${s.badgeSuccess}`;
  if (status === 'REJECTED') return `${s.badge} ${s.badgeDanger}`;
  if (status === 'EXPIRED') return `${s.badge} ${s.badgeDanger}`;
  if (status === 'CANCELLED') return `${s.badge} ${s.badgeNeutral}`;
  return `${s.badge} ${s.badgeNeutral}`;
}

export default async function AdminApprovalsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { organizationId, role } = session;
  const canManage = role === 'OWNER' || role === 'ADMIN_OPERATIONS';

  const [approvals, assets, orders] = await Promise.all([
    getAdminApprovals(organizationId),
    getAdminAssets(organizationId),
    getAdminOrders(organizationId),
  ]);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Approvals</h1>
        <p className={s.pageSubtitle}>Client approval requests — ASSET and QUOTE targets</p>
      </div>

      {canManage && (
        <div className={s.actionBar}>
          <ApprovalActions
            orders={orders.map((o) => ({ id: o.id, status: o.status }))}
            assets={assets.map((a) => ({ id: a.id, order_id: a.order_id, name: a.name ?? null, status: a.status }))}
          />
        </div>
      )}

      {approvals.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No approvals</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Order</th>
                <th>Target</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Decided By</th>
                <th>Expires</th>
                <th>Created</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {approvals.map((a) => (
                <tr key={a.id}>
                  <td className={`${s.cellMono} ${s.cellPrimary}`}>{a.id.slice(0, 8)}…</td>
                  <td className={s.cellMono}>{a.order_id ? a.order_id.slice(0, 8) + '…' : '—'}</td>
                  <td className={s.cellMono}>
                    <span className={`${s.badge} ${s.badgeNeutral}`} style={{ marginRight: '0.25rem' }}>
                      {a.target_type}
                    </span>
                    {a.target_id ? a.target_id.slice(0, 8) + '…' : '—'}
                  </td>
                  <td>
                    <span className={approvalBadgeClass(a.status)}>{a.status}</span>
                  </td>
                  <td className={s.cellMono}>{a.created_by_user_id ? a.created_by_user_id.slice(0, 8) + '…' : '—'}</td>
                  <td className={s.cellMono}>{a.decided_by_user_id ? a.decided_by_user_id.slice(0, 8) + '…' : '—'}</td>
                  <td className={s.cellMono}>
                    {a.expires_at ? new Date(a.expires_at).toLocaleDateString() : '—'}
                  </td>
                  <td className={s.cellMono}>
                    {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
                  </td>
                  {canManage && (
                    <td>
                      <ApprovalActions
                        approvalId={a.id}
                        approvalStatus={a.status}
                        orders={[]}
                        assets={[]}
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
