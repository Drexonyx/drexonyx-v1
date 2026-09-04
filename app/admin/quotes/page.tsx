import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAdminQuotes, getAdminPricingConfig } from '@/lib/admin/queries';
import { isAdminRole } from '@/lib/admin/types';
import { runCostCheck } from '@/lib/admin/cost-check';
import { runMarginCheck } from '@/lib/admin/margin-check';
import { SendQuoteButton } from './SendQuoteButton';
import s from '../admin.module.css';

export const metadata = { title: 'Quotes — Admin' };

function statusBadgeClass(status: string, styles: Record<string, string>) {
  if (status === 'SENT') return `${styles.badge} ${styles.badgeAccent}`;
  if (status === 'ACCEPTED') return `${styles.badge} ${styles.badgeSuccess}`;
  if (status === 'REJECTED') return `${styles.badge} ${styles.badgeDanger}`;
  if (status === 'EXPIRED') return `${styles.badge} ${styles.badgeDanger}`;
  return `${styles.badge} ${styles.badgeNeutral}`;
}

function checkBadgeClass(
  state: 'NOT_READY' | 'FAIL' | 'PASS',
  styles: Record<string, string>,
) {
  if (state === 'PASS') return `${styles.badge} ${styles.badgeSuccess}`;
  if (state === 'FAIL') return `${styles.badge} ${styles.badgeDanger}`;
  return `${styles.badge} ${styles.badgeNeutral}`;
}

export default async function AdminQuotesPage() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) redirect('/admin/login');

  const canSend =
    session.user.role === 'OWNER' || session.user.role === 'ADMIN_OPERATIONS';

  const [quotes, pricingConfig] = await Promise.all([
    getAdminQuotes(session.user.organizationId),
    getAdminPricingConfig(session.user.organizationId),
  ]);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Quotes</h1>
        <p className={s.pageSubtitle}>
          All statuses including DRAFT — Cost Check and Margin Check shown for DRAFT quotes
        </p>
      </div>

      {!pricingConfig && (
        <div className={s.notice}>
          No pricing configuration found for this organization. Margin Check will not pass
          until a pricing config with a minimum_acceptable_margin_rate is set.
        </div>
      )}

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
                <th>Est. Cost</th>
                <th>Cost Check</th>
                <th>Margin Check</th>
                <th>Min. Margin</th>
                <th>Action</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const costCheck = q.status === 'DRAFT'
                  ? runCostCheck(q)
                  : null;
                const marginCheck = q.status === 'DRAFT'
                  ? runMarginCheck(q, pricingConfig)
                  : null;

                return (
                  <tr key={q.id}>
                    <td className={`${s.cellMono} ${s.cellPrimary}`}>
                      {q.id.slice(0, 8)}…
                    </td>
                    <td className={s.cellMono}>
                      {q.campaign_id ? q.campaign_id.slice(0, 8) + '…' : '—'}
                    </td>
                    <td>
                      <span className={statusBadgeClass(q.status, s as unknown as Record<string, string>)}>
                        {q.status}
                      </span>
                    </td>
                    <td className={s.cellMono}>
                      {Number(q.total_amount).toLocaleString('en-US', {
                        style: 'currency',
                        currency: q.currency ?? 'USD',
                      })}
                    </td>
                    <td className={s.cellMono}>
                      {q.estimated_cost != null
                        ? Number(q.estimated_cost).toLocaleString('en-US', {
                            style: 'currency',
                            currency: q.currency ?? 'USD',
                          })
                        : '—'}
                    </td>
                    <td>
                      {costCheck ? (
                        <span
                          className={checkBadgeClass(costCheck.state, s as unknown as Record<string, string>)}
                          title={costCheck.reason}
                        >
                          {costCheck.state}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {marginCheck ? (
                        <span
                          className={checkBadgeClass(marginCheck.state, s as unknown as Record<string, string>)}
                          title={
                            marginCheck.gross_margin_rate
                              ? `${(parseFloat(marginCheck.gross_margin_rate) * 100).toFixed(2)}% — ${marginCheck.reason}`
                              : marginCheck.reason
                          }
                        >
                          {marginCheck.state}
                        </span>
                      ) : '—'}
                    </td>
                    <td className={s.cellMono}>
                      {pricingConfig
                        ? `${(parseFloat(pricingConfig.minimum_acceptable_margin_rate) * 100).toFixed(2)}%`
                        : '—'}
                    </td>
                    <td>
                      {q.status === 'DRAFT' && canSend ? (
                        <SendQuoteButton quoteId={q.id} />
                      ) : '—'}
                    </td>
                    <td className={s.cellMono}>
                      {q.created_at ? new Date(q.created_at).toLocaleDateString() : '—'}
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
