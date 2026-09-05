import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getOrdersWithPaymentStatus } from '@/lib/portal/queries';
import { PayNowButton } from './PayNowButton';
import s from '../portal.module.css';

export const metadata = { title: 'Orders — Client Portal' };

const ORDER_BADGE: Record<string, string> = {
  ACTIVE: s.badgeAccent,
  COMPLETED: s.badgeSuccess,
  CANCELLED: s.badgeNeutral,
};

const PAYMENT_BADGE: Record<string, string> = {
  PENDING: s.badgeWarning,
  PROCESSING: s.badgeAccent,
  PAID: s.badgeSuccess,
  FAILED: s.badgeDanger,
  REFUNDED: s.badgeNeutral,
  CHARGEBACK: s.badgeDanger,
};

export default async function OrdersPage() {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const orders = await getOrdersWithPaymentStatus(session.user.organizationId);

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
                <th>Payment</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const canPay =
                  o.status === 'ACTIVE' &&
                  (o.latestPayment === null ||
                    o.latestPayment.status === 'FAILED' ||
                    o.latestPayment.status === 'PENDING');

                return (
                  <tr key={o.id}>
                    <td className={`${s.cellPrimary} ${s.cellMono}`}>{o.id.slice(0, 8)}…</td>
                    <td>
                      <span className={`${s.badge} ${ORDER_BADGE[o.status] ?? s.badgeNeutral}`}>
                        {o.status}
                      </span>
                    </td>
                    <td>
                      {o.latestPayment ? (
                        <span
                          className={`${s.badge} ${PAYMENT_BADGE[o.latestPayment.status] ?? s.badgeNeutral}`}
                        >
                          {o.latestPayment.status}
                        </span>
                      ) : (
                        <span className={s.badge + ' ' + s.badgeNeutral}>—</span>
                      )}
                    </td>
                    <td className={s.cellMono}>{new Date(o.created_at).toLocaleDateString()}</td>
                    <td>
                      {canPay && <PayNowButton orderId={o.id} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
