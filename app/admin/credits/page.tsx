// DR 0120: Admin credit ledger view — read-only visibility into customer credit balances,
// purchase history, and ledger entries. No mutation from this page.

import { getAdminSession } from '@/lib/admin/session';
import { redirect } from 'next/navigation';
import {
  getAdminCreditBalance,
  getAdminCreditPurchases,
  getAdminCreditLedger,
  getAdminCreditPackages,
} from '@/lib/admin/queries';
import s from '../admin.module.css';

export const metadata = { title: 'Credits — Admin' };

export default async function AdminCreditsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const [balance, purchases, ledger, packages] = await Promise.all([
    getAdminCreditBalance(session.organizationId),
    getAdminCreditPurchases(session.organizationId),
    getAdminCreditLedger(session.organizationId),
    getAdminCreditPackages(),
  ]);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Credits</h1>
        <p className={s.pageSubtitle}>
          Credit balance, packages, purchases, and ledger — read-only
        </p>
      </div>

      {/* Balance summary */}
      <div className={s.statGrid} style={{ marginBottom: '2rem' }}>
        <div className={s.statCard}>
          <div className={s.statLabel}>Current Balance</div>
          <div className={`${s.statValue} ${s.statValueAccent}`}>
            {balance.toLocaleString('en-US')}
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Total Purchases</div>
          <div className={s.statValue}>{purchases.length}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Ledger Entries</div>
          <div className={s.statValue}>{ledger.length}</div>
        </div>
      </div>

      {/* Credit packages catalog */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--drex-text)', marginBottom: '1rem' }}>
        Credit Packages
      </h2>
      <div className={s.tableWrap} style={{ marginBottom: '2rem' }}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Credits</th>
              <th>Price (AED)</th>
              <th>Active</th>
              <th>Order</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((p) => (
              <tr key={p.id}>
                <td className={s.cellPrimary}>{p.name}</td>
                <td className={s.cellMono}>{Number(p.credits).toLocaleString('en-US')}</td>
                <td className={s.cellMono}>{Number(p.price_aed).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>
                  <span className={`${s.badge} ${p.is_active ? s.badgeSuccess : s.badgeNeutral}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className={s.cellMono}>{p.display_order}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Credit purchases */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--drex-text)', marginBottom: '1rem' }}>
        Credit Purchases (last 200)
      </h2>
      {purchases.length === 0 ? (
        <div className={s.emptyState} style={{ padding: '2rem', textAlign: 'left' }}>
          <div className={s.emptyTitle}>No credit purchases</div>
        </div>
      ) : (
        <div className={s.tableWrap} style={{ marginBottom: '2rem' }}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Credits</th>
                <th>Amount (AED)</th>
                <th>Status</th>
                <th>Provider</th>
                <th>Paid At</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td className={s.cellMono}>{p.id.slice(0, 8)}…</td>
                  <td className={s.cellMono}>{Number(p.credits).toLocaleString('en-US')}</td>
                  <td className={s.cellMono}>
                    {Number(p.amount_aed).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span
                      className={`${s.badge} ${
                        p.status === 'COMPLETED'
                          ? s.badgeSuccess
                          : p.status === 'FAILED'
                          ? s.badgeDanger
                          : p.status === 'PENDING' || p.status === 'PROCESSING'
                          ? s.badgeWarning
                          : s.badgeNeutral
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className={s.cellMono}>{p.provider_name ?? '—'}</td>
                  <td className={s.cellMono}>
                    {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}
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

      {/* Credit ledger */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--drex-text)', marginBottom: '1rem' }}>
        Credit Ledger (last 200)
      </h2>
      {ledger.length === 0 ? (
        <div className={s.emptyState} style={{ padding: '2rem', textAlign: 'left' }}>
          <div className={s.emptyTitle}>No ledger entries</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Entry Type</th>
                <th>Delta</th>
                <th>Reference</th>
                <th>Description</th>
                <th>Actor</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span className={`${s.badge} ${s.badgeNeutral}`}>{e.entry_type}</span>
                  </td>
                  <td
                    className={s.cellMono}
                    style={{ color: e.credits_delta >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}
                  >
                    {e.credits_delta >= 0 ? '+' : ''}
                    {Number(e.credits_delta).toLocaleString('en-US')}
                  </td>
                  <td className={s.cellMono}>
                    {e.reference_entity_type ?? '—'}
                    {e.reference_entity_id ? ` ${e.reference_entity_id.slice(0, 8)}…` : ''}
                  </td>
                  <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.description ?? '—'}
                  </td>
                  <td className={s.cellMono}>
                    {e.actor_role ?? '—'}
                  </td>
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
