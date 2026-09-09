import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAdminDeliveries, getAdminAssets, getAdminOrders } from '@/lib/admin/queries';
import { isAdminRole } from '@/lib/admin/types';
import s from '../admin.module.css';
import { DeliveryActions } from './DeliveryActions';

export const metadata = { title: 'Deliveries — Admin' };

// DR 0011: valid Delivery states are PREPARING, SENDING, COMPLETED, FAILED, CANCELLED.
function deliveryBadgeClass(status: string) {
  if (status === 'PREPARING') return `${s.badge} ${s.badgeWarning}`;
  if (status === 'SENDING') return `${s.badge} ${s.badgeAccent}`;
  if (status === 'COMPLETED') return `${s.badge} ${s.badgeSuccess}`;
  if (status === 'FAILED') return `${s.badge} ${s.badgeDanger}`;
  if (status === 'CANCELLED') return `${s.badge} ${s.badgeNeutral}`;
  return `${s.badge} ${s.badgeNeutral}`;
}

export default async function AdminDeliveriesPage() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');

  const { organizationId, role } = session.user;
  const canManage = role === 'OWNER' || role === 'ADMIN_OPERATIONS';

  const [deliveries, assets, orders] = await Promise.all([
    getAdminDeliveries(organizationId),
    getAdminAssets(organizationId),
    getAdminOrders(organizationId),
  ]);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Deliveries</h1>
        <p className={s.pageSubtitle}>Asset delivery lifecycle — PREPARING → SENDING → COMPLETED | FAILED | CANCELLED</p>
      </div>

      {canManage && (
        <div className={s.actionBar}>
          <DeliveryActions
            orders={orders.map((o) => ({ id: o.id, status: o.status }))}
            assets={assets.map((a) => ({ id: a.id, order_id: a.order_id, name: a.name, status: a.status }))}
          />
        </div>
      )}

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
                <th>Failure Reason</th>
                <th>Created</th>
                <th>Updated</th>
                {canManage && <th>Actions</th>}
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
                  <td>{d.failure_reason ?? <span style={{ color: 'var(--drex-text-muted)', fontStyle: 'italic' }}>—</span>}</td>
                  <td className={s.cellMono}>
                    {d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className={s.cellMono}>
                    {d.updated_at ? new Date(d.updated_at).toLocaleDateString() : '—'}
                  </td>
                  {canManage && (
                    <td>
                      <DeliveryActions
                        deliveryId={d.id}
                        deliveryStatus={d.status}
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
