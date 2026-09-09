import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAdminOrders } from '@/lib/admin/queries';
import { isAdminRole } from '@/lib/admin/types';
import s from '../admin.module.css';
import { OrderActions } from './OrderActions';

export const metadata = { title: 'Orders — Admin' };

function orderBadgeClass(status: string, styles: typeof s) {
  if (status === 'ACTIVE') return `${styles.badge} ${styles.badgeAccent}`;
  if (status === 'COMPLETED') return `${styles.badge} ${styles.badgeSuccess}`;
  if (status === 'CANCELLED') return `${styles.badge} ${styles.badgeDanger}`;
  return `${styles.badge} ${styles.badgeNeutral}`;
}

export default async function AdminOrdersPage() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');

  const orders = await getAdminOrders(session.user.organizationId);
  const canManage =
    session.user.role === 'OWNER' || session.user.role === 'ADMIN_OPERATIONS';

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Orders</h1>
        <p className={s.pageSubtitle}>Order lifecycle management</p>
      </div>

      {orders.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No orders</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Campaign</th>
                <th>Quote</th>
                <th>Status</th>
                <th>Created</th>
                <th>Updated</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className={`${s.cellMono} ${s.cellPrimary}`}>{o.id.slice(0, 8)}…</td>
                  <td className={s.cellMono}>
                    {o.campaign_id ? o.campaign_id.slice(0, 8) + '…' : '—'}
                  </td>
                  <td className={s.cellMono}>
                    {o.quote_id ? o.quote_id.slice(0, 8) + '…' : '—'}
                  </td>
                  <td>
                    <span className={orderBadgeClass(o.status, s)}>{o.status}</span>
                  </td>
                  <td className={s.cellMono}>
                    {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className={s.cellMono}>
                    {o.updated_at ? new Date(o.updated_at).toLocaleDateString() : '—'}
                  </td>
                  {canManage && (
                    <td>{o.status === 'ACTIVE' ? <OrderActions orderId={o.id} /> : '—'}</td>
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
