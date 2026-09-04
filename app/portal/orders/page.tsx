import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getOrders } from '@/lib/portal/queries';
import s from '../portal.module.css';

export const metadata = { title: 'Orders — Client Portal' };

export default async function OrdersPage() {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const orders = await getOrders(session.user.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Orders</h1>
        <p className={s.pageSubtitle}>All orders placed by your organization</p>
      </div>

      {orders.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No orders yet</div>
          <div className={s.emptyBody}>Your orders will appear here once placed.</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className={`${s.cellPrimary} ${s.cellMono}`}>{o.id.slice(0, 8)}…</td>
                  <td>
                    <span className={`${s.badge} ${s.badgeNeutral}`}>{o.status}</span>
                  </td>
                  <td className={s.cellMono}>{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
