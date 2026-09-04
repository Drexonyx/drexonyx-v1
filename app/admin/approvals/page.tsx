import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAdminApprovals } from '@/lib/admin/queries';
import { isAdminRole } from '@/lib/admin/types';
import s from '../admin.module.css';

export const metadata = { title: 'Approvals — Admin' };

function approvalBadgeClass(status: string) {
  if (status === 'PENDING') return `${s.badge} ${s.badgeWarning}`;
  if (status === 'APPROVED') return `${s.badge} ${s.badgeSuccess}`;
  if (status === 'REJECTED') return `${s.badge} ${s.badgeDanger}`;
  if (status === 'EXPIRED') return `${s.badge} ${s.badgeDanger}`;
  return `${s.badge} ${s.badgeNeutral}`;
}

export default async function AdminApprovalsPage() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');

  const approvals = await getAdminApprovals(session.user.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Approvals</h1>
        <p className={s.pageSubtitle}>Client approval requests — read-only</p>
      </div>

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
                <th>Status</th>
                <th>Created By</th>
                <th>Decided By</th>
                <th>Expires</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((a) => (
                <tr key={a.id}>
                  <td className={`${s.cellMono} ${s.cellPrimary}`}>{a.id.slice(0, 8)}…</td>
                  <td className={s.cellMono}>{a.order_id ? a.order_id.slice(0, 8) + '…' : '—'}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
