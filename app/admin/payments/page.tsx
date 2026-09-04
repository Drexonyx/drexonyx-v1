import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAdminPayments } from '@/lib/admin/queries';
import { isAdminRole } from '@/lib/admin/types';
import s from '../admin.module.css';

export const metadata = { title: 'Payments — Admin' };

function paymentBadgeClass(status: string) {
  if (status === 'SUCCEEDED') return `${s.badge} ${s.badgeSuccess}`;
  if (status === 'FAILED') return `${s.badge} ${s.badgeDanger}`;
  if (status === 'REFUNDED') return `${s.badge} ${s.badgeWarning}`;
  if (status === 'PENDING') return `${s.badge} ${s.badgeWarning}`;
  return `${s.badge} ${s.badgeNeutral}`;
}

export default async function AdminPaymentsPage() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');

  const payments = await getAdminPayments(session.user.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Payments</h1>
        <p className={s.pageSubtitle}>Payment records — read-only, no mutation</p>
      </div>

      {payments.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No payments</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Order</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Status</th>
                <th>Idempotency Key</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className={`${s.cellMono} ${s.cellPrimary}`}>{p.id.slice(0, 8)}…</td>
                  <td className={s.cellMono}>{p.order_id ? p.order_id.slice(0, 8) + '…' : '—'}</td>
                  <td className={s.cellMono}>
                    {p.amount != null
                      ? Number(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })
                      : '—'}
                  </td>
                  <td className={s.cellMono}>{p.currency}</td>
                  <td>
                    <span className={paymentBadgeClass(p.status)}>{p.status}</span>
                  </td>
                  <td className={s.cellMono} style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.idempotency_key ?? '—'}
                  </td>
                  <td className={s.cellMono}>
                    {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
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
