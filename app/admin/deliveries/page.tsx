import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAdminDeliveries } from '@/lib/admin/queries';
import { isAdminRole } from '@/lib/admin/types';
import s from '../admin.module.css';

export const metadata = { title: 'Deliveries — Admin' };

function deliveryBadgeClass(status: string) {
  if (status === 'PREPARING') return `${s.badge} ${s.badgeWarning}`;
  if (status === 'SENDING') return `${s.badge} ${s.badgeAccent}`;
  if (status === 'DELIVERED') return `${s.badge} ${s.badgeSuccess}`;
  if (status === 'FAILED') return `${s.badge} ${s.badgeDanger}`;
  return `${s.badge} ${s.badgeNeutral}`;
}

export default async function AdminDeliveriesPage() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');

  const deliveries = await getAdminDeliveries(session.user.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Deliveries</h1>
        <p className={s.pageSubtitle}>Asset delivery records — read-only</p>
      </div>

      {deliveries.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No deliveries</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Order</th>
                <th>Status</th>
                <th>Created</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td className={`${s.cellMono} ${s.cellPrimary}`}>{d.id.slice(0, 8)}…</td>
                  <td className={s.cellMono}>{d.order_id ? d.order_id.slice(0, 8) + '…' : '—'}</td>
                  <td>
                    <span className={deliveryBadgeClass(d.status)}>{d.status}</span>
                  </td>
                  <td className={s.cellMono}>
                    {d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className={s.cellMono}>
                    {d.updated_at ? new Date(d.updated_at).toLocaleDateString() : '—'}
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
