import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAdminQuotes } from '@/lib/admin/queries';
import { isAdminRole } from '@/lib/admin/types';
import s from '../admin.module.css';

export const metadata = { title: 'Quotes — Admin' };

function quoteBadgeClass(status: string) {
  if (status === 'SENT') return `${s.badge} ${s.badgeAccent}`;
  if (status === 'ACCEPTED') return `${s.badge} ${s.badgeSuccess}`;
  if (status === 'REJECTED') return `${s.badge} ${s.badgeDanger}`;
  if (status === 'EXPIRED') return `${s.badge} ${s.badgeDanger}`;
  return `${s.badge} ${s.badgeNeutral}`;
}

export default async function AdminQuotesPage() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');

  const quotes = await getAdminQuotes(session.user.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Quotes</h1>
        <p className={s.pageSubtitle}>All statuses including DRAFT — read-only</p>
      </div>

      {/* DRAFT→SENT action is not available: Cost Check and Margin Check
          implementation mechanism is deferred (DR 0041 §16 / DR 0005). */}
      <div className={s.notice}>
        Quote send action is not available. The Cost Check and Margin Check
        implementation required by DR 0041 is deferred (DR 0005 §16).
        A separate approved decision record is required before implementation.
      </div>

      {quotes.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No quotes</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Campaign</th>
                <th>Status</th>
                <th>Total</th>
                <th>Created</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td className={`${s.cellMono} ${s.cellPrimary}`}>{q.id.slice(0, 8)}…</td>
                  <td className={s.cellMono}>{q.campaign_id ? q.campaign_id.slice(0, 8) + '…' : '—'}</td>
                  <td>
                    <span className={quoteBadgeClass(q.status)}>{q.status}</span>
                  </td>
                  <td className={s.cellMono}>
                    {q.total_amount != null
                      ? Number(q.total_amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                      : '—'}
                  </td>
                  <td className={s.cellMono}>
                    {q.created_at ? new Date(q.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className={s.cellMono}>
                    {q.updated_at ? new Date(q.updated_at).toLocaleDateString() : '—'}
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
