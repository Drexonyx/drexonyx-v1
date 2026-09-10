import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import { getAdminFinancialLedger, getAdminExpenses } from '@/lib/admin/queries';
import s from '../admin.module.css';

export const metadata = { title: 'Ledger & Expenses — Admin' };

export default async function AdminFinancialPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const [ledger, expenses] = await Promise.all([
    getAdminFinancialLedger(session.organizationId),
    getAdminExpenses(session.organizationId),
  ]);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Ledger & Expenses</h1>
        <p className={s.pageSubtitle}>Financial records — read-only, no mutation (last 200 each)</p>
      </div>

      <div className={s.pageHeader} style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--drex-text)', marginBottom: '1rem' }}>
          Financial Ledger
        </h2>
      </div>

      {ledger.length === 0 ? (
        <div className={s.emptyState} style={{ padding: '2rem', textAlign: 'left' }}>
          <div className={s.emptyTitle}>No ledger entries</div>
        </div>
      ) : (
        <div className={s.tableWrap} style={{ marginBottom: '2rem' }}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Entry Type</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Reference Type</th>
                <th>Reference ID</th>
                <th>Description</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span className={`${s.badge} ${s.badgeNeutral}`}>{e.entry_type}</span>
                  </td>
                  <td className={s.cellMono}>
                    {e.amount != null
                      ? Number(e.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })
                      : '—'}
                  </td>
                  <td className={s.cellMono}>{e.currency}</td>
                  <td className={s.cellMono}>{e.reference_entity_type ?? '—'}</td>
                  <td className={s.cellMono}>{e.reference_entity_id ? e.reference_entity_id.slice(0, 8) + '…' : '—'}</td>
                  <td>{e.description ?? '—'}</td>
                  <td className={s.cellMono}>
                    {e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--drex-text)', marginBottom: '1rem' }}>
          Expenses
        </h2>
      </div>

      {expenses.length === 0 ? (
        <div className={s.emptyState} style={{ padding: '2rem', textAlign: 'left' }}>
          <div className={s.emptyTitle}>No expenses</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Budget</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Description</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className={s.cellMono}>{e.order_budget_id ? e.order_budget_id.slice(0, 8) + '…' : '—'}</td>
                  <td>
                    <span className={`${s.badge} ${s.badgeNeutral}`}>{e.expense_type}</span>
                  </td>
                  <td className={s.cellMono}>
                    {e.amount != null
                      ? Number(e.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })
                      : '—'}
                  </td>
                  <td className={s.cellMono}>{e.currency}</td>
                  <td>{e.description ?? '—'}</td>
                  <td className={s.cellMono}>
                    {e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}
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
