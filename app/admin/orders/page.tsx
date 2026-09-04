import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAdminOrders } from '@/lib/admin/queries';
import { isAdminRole } from '@/lib/admin/types';
import s from '../admin.module.css';

export const metadata = { title: 'Orders — Admin' };

function orderBadgeClass(status: string) {
  if (status === 'ACTIVE') return `${s.badge} ${s.badgeAccent}`;
  if (status === 'COMPLETED') return `${s.badge} ${s.badgeSuccess}`;
  if (status === 'CANCELLED') return `${s.badge} ${s.badgeDanger}`;
  return `${s.badge} ${s.badgeNeutral}`;
}

export default async function AdminOrdersPage() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');

  const orders = await getAdminOrders(session.user.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Orders</h1>
        <p className={s.pageSubtitle}>All active orders — read-only</p>
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
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className={`${s.cellMono} ${s.cellPrimary}`}>{o.id.slice(0, 8)}…</td>
                  <td className={s.cellMono}>{o.campaign_id ? o.campaign_id.slice(0, 8) + '…' : '—'}</td>
                  <td className={s.cellMono}>{o.quote_id ? o.quote_id.slice(0, 8) + '…' : '—'}</td>
                  <td>
                    <span className={orderBadgeClass(o.status)}>{o.status}</span>
                  </td>
                  <td className={s.cellMono}>
                    {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className={s.cellMono}>
                    {o.updated_at ? new Date(o.updated_at).toLocaleDateString() : '—'}
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
