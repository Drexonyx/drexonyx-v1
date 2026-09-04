import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getPayments } from '@/lib/portal/queries';
import s from '../portal.module.css';

export const metadata = { title: 'Payments — Client Portal' };

const PAYMENT_BADGE: Record<string, string> = {
  PENDING: s.badgeWarning,
  PROCESSING: s.badgeAccent,
  COMPLETED: s.badgeSuccess,
  FAILED: s.badgeDanger,
  REFUNDED: s.badgeNeutral,
};

export default async function PaymentsPage() {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const payments = await getPayments(session.user.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Payments</h1>
        <p className={s.pageSubtitle}>Payment history for your organization</p>
      </div>

      {payments.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No payments on record</div>
          <div className={s.emptyBody}>Your payment history will appear here.</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className={`${s.cellPrimary} ${s.cellMono}`}>{p.id.slice(0, 8)}…</td>
                  <td>
                    <span className={`${s.badge} ${PAYMENT_BADGE[p.status] ?? s.badgeNeutral}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className={s.cellMono}>
                    {Number(p.amount).toLocaleString('en-US', {
                      style: 'currency',
                      currency: p.currency ?? 'USD',
                    })}
                  </td>
                  <td className={s.cellMono}>{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
