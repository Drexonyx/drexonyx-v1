import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getQuotes } from '@/lib/portal/queries';
import s from '../portal.module.css';

export const metadata = { title: 'Quotes — Client Portal' };

const QUOTE_BADGE: Record<string, string> = {
  SENT: s.badgeAccent,
  ACCEPTED: s.badgeSuccess,
  REJECTED: s.badgeDanger,
  EXPIRED: s.badgeNeutral,
  CANCELLED: s.badgeNeutral,
};

export default async function QuotesPage() {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const quotes = await getQuotes(session.user.organizationId);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Quotes</h1>
        <p className={s.pageSubtitle}>Quotes issued to your organization</p>
      </div>

      {quotes.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No quotes yet</div>
          <div className={s.emptyBody}>Quotes will appear here once issued.</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Quote ID</th>
                <th>Status</th>
                <th>Total</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td className={`${s.cellPrimary} ${s.cellMono}`}>{q.id.slice(0, 8)}…</td>
                  <td>
                    <span className={`${s.badge} ${QUOTE_BADGE[q.status] ?? s.badgeNeutral}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className={s.cellMono}>
                    {q.total_amount != null
                      ? Number(q.total_amount).toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        })
                      : '—'}
                  </td>
                  <td className={s.cellMono}>{new Date(q.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
